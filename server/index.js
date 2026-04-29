const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { TABLES, getPool, initSchema, seedDemoData, ping } = require('./db');

const PORT = Number(process.env.PORT) || 3001;
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

let dbReady = false;
let lastDbError = null;

async function ensureDb() {
  try {
    await ping();
    await initSchema();
    await seedDemoData();
    dbReady = true;
    lastDbError = null;
    console.log('[db] MySQL 已连接并完成表结构与演示数据初始化');
  } catch (e) {
    dbReady = false;
    lastDbError = e.message || String(e);
    console.error('[db] MySQL 不可用:', lastDbError);
    console.error('[db] 请在本机 MySQL 先执行: CREATE DATABASE hengyi_huoke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    console.error('[db] 并核对项目根目录 .env 中 MYSQL_HOST / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE');
  }
}

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
if (!fs.existsSync(envPath)) {
  console.warn('[env] 未找到 .env，请复制: cp .env.example .env 并按服务器填写 MYSQL_*');
}

app.get('/api/health', async (_req, res) => {
  res.json({
    ok: true,
    db: dbReady,
    time: new Date().toISOString(),
  });
});

/** 部署自检：不含密码，便于 curl 排查 */
app.get('/api/ready', (_req, res) => {
  const indexHtmlPath = path.join(rootDir, 'dist', 'index.html');
  const has = (k) => Boolean(process.env[k] && String(process.env[k]).trim());
  res.json({
    ok: true,
    time: new Date().toISOString(),
    port: PORT,
    envFile: fs.existsSync(envPath),
    dist: fs.existsSync(indexHtmlPath),
    db: dbReady,
    dbError: dbReady ? null : lastDbError,
    mysqlEnv: {
      MYSQL_HOST: has('MYSQL_HOST'),
      MYSQL_USER: has('MYSQL_USER'),
      MYSQL_DATABASE: has('MYSQL_DATABASE'),
      MYSQL_PASSWORD: has('MYSQL_PASSWORD'),
    },
  });
});

app.post('/api/leads', async (req, res) => {
  const { name, phone, interest, scenario, note } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: '请填写姓名与联系电话' });
  }
  if (!dbReady) {
    return res.status(503).json({ error: '数据库未就绪，请稍后重试或联系管理员' });
  }
  try {
    const pool = getPool();
    const [r] = await pool.query(
      `INSERT INTO ${TABLES.leads} (name, phone, interest, scenario, note) VALUES (?,?,?,?,?)`,
      [String(name).slice(0, 64), String(phone).slice(0, 32), interest || null, scenario || null, note || null]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '保存失败' });
  }
});

app.get('/api/leads/stats', async (_req, res) => {
  if (!dbReady) return res.json({ total: 0, today: 0, db: false });
  try {
    const pool = getPool();
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${TABLES.leads}`);
    const [[{ today }]] = await pool.query(
      `SELECT COUNT(*) AS today FROM ${TABLES.leads} WHERE DATE(created_at) = CURDATE()`
    );
    res.json({ total, today, db: true });
  } catch (e) {
    res.status(500).json({ error: '读取统计失败' });
  }
});

app.get('/api/dashboard', async (_req, res) => {
  if (!dbReady) {
    return res.status(503).json({ error: '数据库未连接，暂无法读取看板数据' });
  }
  try {
    const pool = getPool();
    const [projects] = await pool.query(
      `SELECT id, channel, project_name, stage, budget_range, owner, updated_at
       FROM ${TABLES.projects}
       ORDER BY updated_at DESC
       LIMIT 12`
    );
    const [timeline] = await pool.query(
      `SELECT id, event_time, event_type, customer_name, summary, source
       FROM ${TABLES.timeline}
       ORDER BY event_time DESC
       LIMIT 12`
    );
    const [[{ chatToday }]] = await pool.query(
      `SELECT COUNT(*) AS chatToday FROM ${TABLES.chats} WHERE DATE(created_at)=CURDATE()`
    );
    res.json({
      db: true,
      projects,
      timeline,
      chatToday,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '读取看板数据失败' });
  }
});

const SYSTEM_PROMPT = `你是「桓颐装饰」的资深家装顾问与获客策略助理。公司聚焦上海住宅与商铺装修，主打 AI 维修检测获客、新房交付与商铺新租数据获客、智能报价与内容流量。
回答要专业、简洁、可信；涉及价格用区间表述；鼓励用户留下联系方式以便设计师回访；单次回复控制在 400 字以内。`;

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: '未配置 DEEPSEEK_API_KEY' });
  }
  const { message, sessionId, history = [] } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: '请输入咨询内容' });
  }
  const sid = sessionId && String(sessionId).length >= 8 ? String(sessionId) : crypto.randomUUID();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.content).slice(0, 4000),
    })),
    { role: 'user', content: message.slice(0, 4000) },
  ];

  try {
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.6,
        max_tokens: 1024,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('DeepSeek error:', data);
      return res.status(502).json({ error: data.error?.message || 'AI 服务暂时不可用' });
    }
    const text = data.choices?.[0]?.message?.content || '';
    if (dbReady) {
      try {
        const pool = getPool();
        await pool.query(`INSERT INTO ${TABLES.chats} (session_id, role, content) VALUES (?,?,?)`, [
          sid,
          'user',
          message.slice(0, 8000),
        ]);
        await pool.query(`INSERT INTO ${TABLES.chats} (session_id, role, content) VALUES (?,?,?)`, [
          sid,
          'assistant',
          text.slice(0, 8000),
        ]);
      } catch (e) {
        console.warn('[db] 聊天记录写入失败', e.message);
      }
    }
    res.json({ reply: text, sessionId: sid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '网络异常，请稍后重试' });
  }
});

const dist = path.join(rootDir, 'dist');
const indexHtmlPath = path.join(dist, 'index.html');

function setupFrontend() {
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('[ui] 未找到 dist/index.html，浏览器访问将提示 503。请在项目根目录执行: npm ci && npm run build');
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      if (req.method !== 'GET') return next();
      res
        .status(503)
        .type('html')
        .send(
          '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>需先构建前端</title></head><body style="font-family:system-ui,sans-serif;padding:24px;max-width:560px;">' +
            '<h1 style="margin-top:0;">503 · 前端未构建</h1>' +
            '<p>缺少 <code>dist/index.html</code>。在服务器项目根目录执行：</p>' +
            '<pre style="background:#f1f5f9;padding:12px;border-radius:8px;overflow:auto;">npm ci\nnpm run build\nnpm run start</pre>' +
            '<p>然后重启 Node。API（如 <code>/api/health</code>）在未构建时仍可用。</p>' +
            '</body></html>'
        );
    });
    return;
  }
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(indexHtmlPath, (err) => {
      if (err) next(err);
    });
  });
}

setupFrontend();

ensureDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`桓颐装饰 AI 获客服务已启动`);
    console.log(`  本机: http://127.0.0.1:${PORT}/`);
    console.log(`  外网: http://服务器公网IP:${PORT}/ （安全组/ufw 需放行该端口）`);
  });
});
