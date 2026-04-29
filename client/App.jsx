import { useEffect, useRef, useState } from 'react';
import './App.css';

const MODULES = [
  {
    key: 'm1',
    title: '一、行业最高ROI：AI维修检测获客（首选）',
    roiTag: 'ROI 1:10～1:30',
    subtitle: '成本最低(20-60元)、留资率50%+、可转整体装修',
    tier: 'high',
    items: [
      { name: 'AI卫生间漏水检测', desc: '拍照AI诊断漏水、渗水、维修报价' },
      { name: 'AI厨房维修诊断', desc: '橱柜、台面、下水、五金老化检测' },
      { name: 'AI门窗维修更换', desc: '破损、异响、老化、推拉不畅报价' },
      { name: 'AI商铺快修检测', desc: '商铺水电、门头、墙面、地面维修' },
    ],
  },
  {
    key: 'm2',
    title: '二、高ROI：AI新房/商铺装修获客',
    roiTag: 'ROI 1:4～1:12',
    tier: 'mid',
    items: [
      { name: 'AI新交付房获客', desc: '上海新房/刚交房小区线索抓取' },
      { name: 'AI商铺装修获客', desc: '沿街商铺、写字楼、门店装修需求' },
      { name: 'AI户型3D效果图', desc: '住宅/商铺户型一键生成3D方案' },
      { name: 'AI智能报价', desc: '住宅/商铺统一AI自动报价' },
    ],
  },
  {
    key: 'm3',
    title: '三、AI内容流量引擎',
    roiTag: 'ROI 1:2～1:5',
    tier: 'low',
    items: [
      { name: '装修前后对比视频', desc: '案例成片与投放素材' },
      { name: '数字人讲解方案', desc: '口播与讲解自动化' },
      { name: '多平台自动分发', desc: '抖音/小红书等一键分发' },
      { name: '商铺装修案例视频', desc: '商户场景垂直内容' },
    ],
  },
];

const DATA_CHANNELS = [
  {
    title: '上海新交付房数据来源（实时更新）',
    icon: '🏠',
    lines: [
      '政府公开：住建委 / 房管局交房公示',
      '房产平台：房天下、安居客、链家新房交付',
      '社群公示：业主群、交房群、物业公告',
      '自动流程：抓取线索 → 外呼短信 → 小程序留资',
    ],
  },
  {
    title: '上海商铺装修数据来源（高客单）',
    icon: '🏪',
    lines: [
      '出租平台：58、赶集、安居客、铺先生',
      '招商写字楼：点点租、好租、办办网',
      '新店公示：美团/大众点评新入驻与转让信息',
      'AI识别新租商铺并打标签推送给顾问',
    ],
  },
  {
    title: '自动获客链路（可落地）',
    icon: '🤖',
    lines: [
      '每日抓取：最新交房小区 + 新租商铺',
      '外呼/短信：推送设计、报价、检测服务',
      '智能投流：定向小区/商圈短视频投放',
      '留资与标签：预算、面积、风格 → 销售跟进',
    ],
  },
];

const ROI_ROWS = [
  ['AI维修/商铺快修', '20-60元', '50%-70%', '1:10-1:30'],
  ['AI新房/商铺获客', '80-180元', '35%-50%', '1:4-1:12'],
  ['AI报价/效果图', '150-300元', '25%-35%', '1:3-1:8'],
  ['传统广告', '200-500元', '10%以下', '1:0.5-1:2'],
];

function useSessionId() {
  const ref = useRef('');
  if (!ref.current) ref.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  return ref.current;
}

export default function App() {
  const sessionId = useSessionId();
  const [health, setHealth] = useState({ db: false });
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [leadOpen, setLeadOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [name, setName] = useState('张先生');
  const [phone, setPhone] = useState('13800138001');
  const [interest, setInterest] = useState('浦东120平新房全案，预算30万，现代风');
  const [msg, setMsg] = useState('');
  const [chatInput, setChatInput] = useState('新房全案一般工期多久？');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    Promise.all([fetch('/api/health').then((r) => r.json()), fetch('/api/leads/stats').then((r) => r.json())])
      .then(([h, s]) => {
        setHealth(h);
        setStats(s);
      })
      .catch(() => {});
  }, [leadOpen]);

  const openLead = (scene) => {
    setInterest(`${scene}，希望了解预算、工期和设计方案`);
    setLeadOpen(true);
  };
  const fillDemo = () => {
    setName('李女士');
    setPhone('13900139002');
    setInterest('静安沿街商铺快装，要求20天交付，先看标准版报价');
  };

  const submitLead = async (e) => {
    e.preventDefault();
    const r = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, interest, scenario: interest }),
    });
    const d = await r.json();
    setMsg(r.ok ? '提交成功，顾问会尽快联系你。' : d.error || '提交失败');
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, history: messages }),
      });
      const d = await r.json();
      setMessages((m) => [...m, { role: 'assistant', content: r.ok ? d.reply : d.error || 'AI不可用' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '网络异常' }]);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="brand">桓颐装饰 AI 获客指挥台</div>
          <div className="sub">数据库直连 · 线索流转 · AI跟进 · 成交看板</div>
        </div>
        <div className="metric-row">
          <span className={health.db ? 'badge ok' : 'badge warn'}>{health.db ? '数据库在线' : '数据库未连接'}</span>
          <span className="badge">累计留资 {stats.total}</span>
          <span className="badge">今日留资 {stats.today}</span>
        </div>
      </header>

      <section className="panel module-stack">
        {MODULES.map((m) => (
          <article key={m.key} className="module-block">
            <header className="module-block__head">
              <h2 className="module-block__title">{m.title}</h2>
              {m.roiTag && <span className="module-block__tag">{m.roiTag}</span>}
            </header>
            {m.subtitle && <p className="module-block__sub">{m.subtitle}</p>}
            <div className="module-grid">
              {m.items.map((it) => (
                <button
                  key={it.name}
                  type="button"
                  className={`module-card module-card--${m.tier}`}
                  onClick={() => openLead(it.name)}
                >
                  <span className="module-card__name">{it.name}</span>
                  {it.desc && <span className="module-card__desc">{it.desc}</span>}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <header className="module-block__head module-block__head--solo">
          <h2 className="module-block__title">四、AI获取上海新房+商铺数据通道</h2>
        </header>
        <div className="info-stack">
          {DATA_CHANNELS.map((block) => (
            <div key={block.title} className="info-card">
              <h3 className="info-card__title">
                <span className="info-card__icon" aria-hidden>
                  {block.icon}
                </span>
                {block.title}
              </h3>
              <ul className="info-card__list">
                {block.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="module-block__head module-block__head--solo">
          <h2 className="module-block__title">五、行业真实ROI对比</h2>
        </header>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>方案</th>
                <th>成本</th>
                <th>留资率</th>
                <th>ROI</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ROI_ROWS.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, j) => (
                    <td key={`${r[0]}-${j}`}>{c}</td>
                  ))}
                  <td>
                    <button type="button" className="tiny" onClick={() => openLead(r[0])}>
                      咨询
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {leadOpen && (
        <div className="modal">
          <button type="button" className="mask" onClick={() => setLeadOpen(false)} aria-label="关闭" />
          <form className="dialog" onSubmit={submitLead}>
            <h3>预约顾问</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机" />
            <textarea rows={3} value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="需求描述" />
            <div className="dialog-actions">
              <button type="button" className="secondary" onClick={fillDemo}>
                填充测试数据
              </button>
              <button type="button" className="tiny" onClick={() => setChatOpen(true)}>
                下一步：AI预沟通
              </button>
            </div>
            {msg && <div className="msg">{msg}</div>}
            <button type="submit" className="primary">
              确认提交
            </button>
          </form>
        </div>
      )}

      {chatOpen && (
        <aside className="chat">
          <header>
            <strong>AI 顾问</strong>
            <button type="button" onClick={() => setChatOpen(false)}>
              关闭
            </button>
          </header>
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'bubble u' : 'bubble a'}>
                {m.content}
              </div>
            ))}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="输入问题…" />
            <button type="submit" className="primary">
              发送
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}
