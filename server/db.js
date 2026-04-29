const mysql = require('mysql2/promise');

let pool = null;
const TABLES = {
  leads: 'hy_customer_leads',
  chats: 'hy_ai_chat_logs',
  projects: 'hy_demo_projects',
  timeline: 'hy_demo_timeline',
};

function getPool() {
  if (pool) return pool;
  const {
    MYSQL_HOST = '127.0.0.1',
    MYSQL_PORT = 3306,
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '',
    MYSQL_DATABASE = 'hengyi_huoke',
  } = process.env;

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
  return pool;
}

async function initSchema() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS ${TABLES.leads} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      interest VARCHAR(255) DEFAULT NULL,
      scenario VARCHAR(128) DEFAULT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created (created_at),
      INDEX idx_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS ${TABLES.chats} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(64) NOT NULL,
      role ENUM('user','assistant') NOT NULL,
      content MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS ${TABLES.projects} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      channel VARCHAR(32) NOT NULL,
      project_name VARCHAR(128) NOT NULL,
      stage VARCHAR(32) NOT NULL,
      budget_range VARCHAR(64) NOT NULL,
      owner VARCHAR(32) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_stage (stage),
      INDEX idx_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS ${TABLES.timeline} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_time DATETIME NOT NULL,
      event_type VARCHAR(32) NOT NULL,
      customer_name VARCHAR(32) NOT NULL,
      summary VARCHAR(255) NOT NULL,
      source VARCHAR(32) NOT NULL,
      INDEX idx_time (event_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

/** @param {{ force?: boolean }} [opts] force=true 时清空四张业务表后重新灌演示数据（仅演示/测试库使用） */
async function seedDemoData(opts = {}) {
  const force = opts.force === true;
  const p = getPool();

  if (force) {
    await p.query(`SET FOREIGN_KEY_CHECKS=0`);
    await p.query(`TRUNCATE TABLE ${TABLES.timeline}`);
    await p.query(`TRUNCATE TABLE ${TABLES.chats}`);
    await p.query(`TRUNCATE TABLE ${TABLES.projects}`);
    await p.query(`TRUNCATE TABLE ${TABLES.leads}`);
    await p.query(`SET FOREIGN_KEY_CHECKS=1`);
  }

  const [[{ leadsCount }]] = await p.query(`SELECT COUNT(*) AS leadsCount FROM ${TABLES.leads}`);
  if (force || leadsCount === 0) {
    await p.query(
      `INSERT INTO ${TABLES.leads} (name, phone, interest, scenario, note, created_at) VALUES
      ('张先生', '13800138001', '浦东120平新房全案', '新房智投', '偏现代风，预算30万', NOW() - INTERVAL 2 DAY),
      ('李女士', '13900139002', '静安商铺快装', '商铺快修', '工期要求20天', NOW() - INTERVAL 1 DAY),
      ('王老板', '13700137003', '徐汇漏水检测', '漏水快检', '卫生间渗水，想先检测', NOW() - INTERVAL 6 HOUR),
      ('陈女士', '13600136004', '闵行旧房翻新', '智能报价', '预算25万，想先看区间报价', NOW() - INTERVAL 3 HOUR),
      ('赵先生', '13500135005', '杨浦门头改造', '商户拓客', '门头和水电同时调整', NOW() - INTERVAL 1 HOUR),
      ('刘女士', '13400134006', '虹口整装拎包入住', '新房智投', '软装+全屋定制套餐咨询', NOW() - INTERVAL 45 MINUTE),
      ('孙先生', '13300133007', '嘉定商铺水电改造', '商铺快修', '开业前一周须完工', NOW() - INTERVAL 30 MINUTE),
      ('周小姐', '13200132008', '静安全屋智能灯光', '智能报价', '无主灯设计预算咨询', NOW() - INTERVAL 15 MINUTE)`
    );
  }

  const [[{ projectsCount }]] = await p.query(`SELECT COUNT(*) AS projectsCount FROM ${TABLES.projects}`);
  if (force || projectsCount === 0) {
    await p.query(
      `INSERT INTO ${TABLES.projects} (channel, project_name, stage, budget_range, owner) VALUES
      ('抖音线索', '浦东锦绣云庭 · 全屋装修', '方案沟通', '28-35万', '顾问-周岚'),
      ('小程序', '静安沿街商铺 · 快速翻新', '待签约', '15-22万', '顾问-陈驰'),
      ('SEO官网', '闵行次新房 · 局改+软装', '量房完成', '18-24万', '顾问-沈悦'),
      ('短视频投流', '杨浦美业门店 · 品牌升级', '已报价', '12-16万', '顾问-林岳'),
      ('微信私域', '徐汇老房 · 卫生间渗漏处理', '施工中', '4-7万', '顾问-何涛'),
      ('小红书', '长宁公寓 · 厨卫翻新套餐', '待量房', '8-12万', '顾问-韩琪'),
      ('地图获客', '青浦叠墅 · 地下室防潮', '意向确认', '35-42万', '顾问-丁锐')`
    );
  }

  const [[{ timelineCount }]] = await p.query(`SELECT COUNT(*) AS timelineCount FROM ${TABLES.timeline}`);
  if (force || timelineCount === 0) {
    await p.query(
      `INSERT INTO ${TABLES.timeline} (event_time, event_type, customer_name, summary, source) VALUES
      (NOW() - INTERVAL 3 HOUR, '留资', '王老板', '提交漏水检测需求并上传现场图', '漏水快检'),
      (NOW() - INTERVAL 150 MINUTE, 'AI跟进', '王老板', 'AI顾问输出初步判断与复勘建议', 'AI顾问'),
      (NOW() - INTERVAL 90 MINUTE, '顾问回访', '王老板', '电话确认渗漏位置并预约上门', '销售外呼'),
      (NOW() - INTERVAL 50 MINUTE, '量房预约', '李女士', '商铺项目约定次日到场测量', '商铺快修'),
      (NOW() - INTERVAL 20 MINUTE, '报价发送', '李女士', '发送标准版报价与工期方案', '智能报价'),
      (NOW() - INTERVAL 10 MINUTE, '到店', '刘女士', '到店看样板间与材料册', '前台接待'),
      (NOW() - INTERVAL 5 MINUTE, '线索分配', '孙先生', '嘉定商铺单分配给顾问陈驰', 'CRM')`
    );
  }

  const [[{ chatsCount }]] = await p.query(`SELECT COUNT(*) AS chatsCount FROM ${TABLES.chats}`);
  if (force || chatsCount === 0) {
    await p.query(
      `INSERT INTO ${TABLES.chats} (session_id, role, content) VALUES
      ('demo-huanyi-001', 'user', '浦东新房全案大概工期多久？'),
      ('demo-huanyi-001', 'assistant', '您好，浦东全案一般毛坯开工后约 90–120 个工作日，具体看拆改与木作深度；可先预约免费量房与排期表。'),
      ('demo-huanyi-002', 'user', '商铺快装能压缩到20天内吗？'),
      ('demo-huanyi-002', 'assistant', '赶工可行但需现场确认物业施工时间与消防要求；建议先做平面与水电点位，我们再给你两套工期与报价区间。')`
    );
  }
}

async function ping() {
  const p = getPool();
  await p.query('SELECT 1');
  return true;
}

module.exports = { TABLES, getPool, initSchema, seedDemoData, ping };
