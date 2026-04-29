import { useState, useEffect } from 'react';

export function MiniAppShell({ app, open, onClose, onRequestLead }) {
  const [tab, setTab] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [area, setArea] = useState(89);
  const [style, setStyle] = useState('现代');

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setTab(0);
    }
  }, [open, app?.id]);

  if (!open || !app) return null;

  const STYLES = ['现代', '原木', '轻奢', '极简'];

  const runDetect = () => {
    setPhase('loading');
    setTimeout(() => setPhase('done'), 1400);
  };

  const estLow = Math.round(area * 1.2 + 88 + (style === '轻奢' ? 40 : 0));
  const estHigh = Math.round(area * 2.1 + 220 + (style === '轻奢' ? 80 : 0));

  return (
    <div className="mini-overlay" role="dialog" aria-modal="true" aria-label={app.name}>
      <button type="button" className="mini-overlay__bg" onClick={onClose} aria-label="关闭" />
      <div className="mini-device">
        <div className="mini-device__speaker" />
        <header className="mini-device__head">
          <button type="button" className="mini-device__back" onClick={onClose}>‹</button>
          <div className="mini-device__headtext">
            <span className="mini-device__brand">桓颐服务</span>
            <h2 className="mini-device__apptitle">{app.name}</h2>
          </div>
          <div className="mini-device__icons">
            <span className="mini-device__dot" style={{ background: app.accent }} />
          </div>
        </header>

        <div className="mini-device__body">
          {app.type === 'detect' && (
            <div className="mini-page">
              <p className="mini-lead">模拟：上传现场照片，AI 输出渗漏可能性与处理建议</p>
              <div
                className="mini-drop"
                onClick={phase === 'idle' ? runDetect : undefined}
                style={{ borderColor: app.accent }}
              >
                {phase === 'idle' && (
                  <>
                    <span className="mini-drop__icon" aria-hidden>📷</span>
                    <span>点击选择照片（演示）</span>
                  </>
                )}
                {phase === 'loading' && <span className="mini-pulse">分析中…</span>}
                {phase === 'done' && <span>已生成报告</span>}
              </div>
              {phase === 'done' && (
                <div className="mini-card mini-card--result">
                  <div className="mini-card__row">
                    <span>风险</span>
                    <strong>中等</strong>
                  </div>
                  <p className="mini-card__hint">{app.resultHint || '可安排工程师上门复测'}</p>
                </div>
              )}
            </div>
          )}

          {app.type === 'quote' && (
            <div className="mini-page">
              <p className="mini-lead">拖动面积，点选风格，查看区间价（演示）</p>
              <label className="mini-field">
                面积 m²
                <input
                  type="range"
                  min="35"
                  max="220"
                  value={area}
                  onChange={(e) => setArea(+e.target.value)}
                />
                <div className="mini-field__val">{area} m²</div>
              </label>
              <div className="mini-chips">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={'mini-chip' + (style === s ? ' mini-chip--on' : '')}
                    onClick={() => setStyle(s)}
                    style={style === s ? { background: app.accent, borderColor: app.accent } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mini-estimate" style={{ borderLeftColor: app.accent }}>
                <div className="mini-estimate__label">参考全包区间</div>
                <div className="mini-estimate__num">
                  ¥{estLow.toLocaleString()} – ¥{estHigh.toLocaleString()}
                </div>
                <div className="mini-estimate__tip">以实地勘测为准</div>
              </div>
            </div>
          )}

          {app.type === 'board' && (
            <div className="mini-page">
              <div className="mini-tabs" role="tablist">
                <button
                  type="button"
                  className={'mini-tab' + (tab === 0 ? ' mini-tab--on' : '')}
                  onClick={() => setTab(0)}
                  style={tab === 0 ? { color: app.accent, borderBottomColor: app.accent } : {}}
                >
                  待跟进
                </button>
                <button
                  type="button"
                  className={'mini-tab' + (tab === 1 ? ' mini-tab--on' : '')}
                  onClick={() => setTab(1)}
                  style={tab === 1 ? { color: app.accent, borderBottomColor: app.accent } : {}}
                >
                  已约访
                </button>
              </div>
              <ul className="mini-list">
                {[
                  { t: '浦东新区 · 待交房盘', s: '预计 12 户', a: '领取' },
                  { t: '静安区 · 商业街', s: '新租 3 铺', a: '拨打' },
                  { t: '闵行 · 小区团购', s: '线索 28', a: '查看' },
                ].map((row, i) => (
                  <li key={i} className="mini-list__item" style={{ borderLeftColor: app.accent }}>
                    <div>
                      <div className="mini-list__t">{row.t}</div>
                      <div className="mini-list__s">{row.s}</div>
                    </div>
                    <button type="button" className="mini-list__btn" style={{ color: app.accent }}>
                      {row.a}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {app.type === 'content' && (
            <div className="mini-page">
              <p className="mini-lead">内容任务看板（演示可点）</p>
              {[
                { t: '小区对比 · 第 2 期', st: '渲染中' },
                { t: '商铺口播 · 口播 15s', st: '已发抖音' },
              ].map((v, i) => (
                <div key={i} className="mini-video-row" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
                  <div className="mini-video-row__play">▶</div>
                  <div>
                    <div className="mini-video-row__t">{v.t}</div>
                    <div className="mini-video-row__st">{v.st}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mini-device__foot">
          <button
            type="button"
            className="mini-device__primary"
            style={{ background: `linear-gradient(135deg, ${app.accent}, #1e1b4b)` }}
            onClick={() => onRequestLead(app.name)}
          >
            留资获取完整方案
          </button>
        </footer>
      </div>
    </div>
  );
}
