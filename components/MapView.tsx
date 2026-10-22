'use client';
// Карта зоны: метки квестов по quest.map, путь цепочки к сундуку, страж у перевала, туман следующей главы.
// Подписаны только квесты, которые можно взять или сдать; закрытые и пройденные — по наведению.
import { useEffect, useRef, useState } from 'react';
import { doneCount, type Point, type Quest } from '@/engine/src/engine';
import { CHAIN_OF, QBY, QUESTS, RULES, ZONE, ZONE2 } from '@/lib/content';
import { TYPE, deadlineText, tierOf } from '@/lib/ui';
import { Banners } from './Banners';
import { useGame } from './GameProvider';

const curve = (a: Point, b: Point) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  return `M${a.x} ${a.y} Q${mx - dy * 0.15} ${my + dx * 0.15} ${b.x} ${b.y}`;
};
const done = (n: number) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4DDC8" strokeWidth={3.2} aria-hidden="true" key={n}><path d="M5 12l5 5 9-10" /></svg>;

// Карта нарисована в координатах контента. На ПК блок сжимает её под ширину колонки, а не обрезает;
// на широком растёт до 1.3; на узком экране (сжатие сильнее 0.6) карта остаётся в натуральную величину и прокручивается вбок.
function useFit(w: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { const r = el.clientWidth / w; setK(r >= 0.6 ? Math.min(1.3, r) : 1); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return [ref, k] as const;
}

function Decor() {
  return (
    <>
      <g fill="none" stroke="#6E5532" strokeWidth={1.6}><path d="M640 120 l14 -22 l14 22" /><path d="M662 124 l12 -18 l12 18" /><path d="M622 128 l10 -15 l10 15" /></g>
      <path d="M70 230 C96 280 98 340 86 390 C78 420 80 445 88 465" fill="none" stroke="#7F9AA0" strokeWidth={4} strokeLinecap="round" opacity=".45" />
      <g transform="translate(96 98)" opacity=".7"><circle r="26" fill="none" stroke="#8A6A3C" strokeWidth={1} /><polygon points="0,-30 5,-5 0,0 -5,-5" fill="#8A3B22" /><polygon points="0,30 5,5 0,0 -5,5" fill="#8A6A3C" /><polygon points="-30,0 -5,-5 0,0 -5,5" fill="#8A6A3C" /><polygon points="30,0 5,-5 0,0 5,5" fill="#8A6A3C" /></g>
    </>
  );
}

function Marker({ q }: { q: Quest }) {
  const { D, open } = useGame();
  const p = q.map!, st = D.status[q.id], s = D.qs[q.id];
  const halo = st === 'open' || st === 'prog' || st === 'ready';
  const n = doneCount(s);
  const ly = st === 'done' || st === 'locked' ? 22 : 28;
  const quiet = st === 'done' || st === 'locked';
  return (
    <>
      <button type="button" className={`mk ${st}${halo ? ' halo' : ''}`} title={quiet ? q.title : undefined} style={{ left: p.x, top: p.y }} aria-label={q.title} onClick={() => open({ q: q.id })}>
        <span className="shield">{st === 'done' ? done(0) : st === 'open' ? '!' : '?'}</span>
      </button>
      <span className={'mlabel' + (quiet ? ' hov' : '')} style={{ left: p.x, top: p.y + ly }}>
        {q.title}
        {(st === 'prog' || st === 'ready') && <small>{st === 'ready' ? 'можно сдать' : 'в работе'} · {n}/{q.tasks.length}</small>}
      </span>
    </>
  );
}

export function MapView() {
  const { D, open } = useGame();
  const M = ZONE.map!, W = M.size.w, H = M.size.h;
  const [box, k] = useFit(W);
  const ch = ZONE.chains[0], cs = D.chains[ch.id], CP = M.chest[ch.id], B = M.boss;
  const pos = (id: string) => QBY[id]?.map;
  const paths: React.ReactNode[] = [];
  for (const q of QUESTS) for (const d of q.deps) {
    const a = pos(d), b = q.map;
    if (a && b && CHAIN_OF[q.id] && CHAIN_OF[q.id] === CHAIN_OF[d]) paths.push(<path key={d + '>' + q.id} d={curve(a, b)} fill="none" stroke="var(--route)" strokeWidth={3} strokeLinecap="round" />);
  }
  const chestLbl = { locked: `осталось ${cs.total - cs.done} из ${cs.total} квестов`, ready: 'готов — открыть!', empty_pool: 'пул пуст', opened: 'вещь выпала', received: 'получен', swapped: 'обменян' }[cs.chest];
  const got = D.bossKeys.filter(k => k.ok).length;
  const prog = QUESTS.filter(q => D.status[q.id] === 'prog' || D.status[q.id] === 'ready');
  const avail = QUESTS.filter(q => D.status[q.id] === 'open');
  const row = (q: Quest, cls: string, meta: string) => (
    <button key={q.id} type="button" className={'zrow ' + cls} onClick={() => open({ q: q.id })}><span className="sh" /><span className="t">{q.title}</span><span className="m">{meta}</span></button>
  );
  return (
    <section className="view" role="tabpanel" id="view-map">
      <Banners />
      <div className="main">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 16px', marginBottom: 12 }}><h2 style={{ fontSize: 26 }}>Зона I · {ZONE.title}</h2><span className="legend"><span><i className="lg open" />можно взять</span><span><i className="lg prog" />в работе</span><span><i className="lg locked" />под печатью</span><span><i className="lg done" />пройдено</span><span><i className="lg route" />путь к сундуку</span></span></div>
        <div className="map-box" ref={box} style={{ height: H * k }}><div className="map map-fit" style={{ width: W, height: H, transform: k < 1 ? `scale(${k})` : undefined }}>
          <div className="glow" style={{ left: 560, top: -60, width: 420, height: 420, background: 'radial-gradient(circle,rgba(74,60,42,.55),rgba(11,8,6,0) 70%)' }} />
          <div className="glow" style={{ left: 640, top: 330, width: 380, height: 380, background: 'radial-gradient(circle,rgba(64,52,36,.5),rgba(11,8,6,0) 70%)' }} />
          <div className="isle" />
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <Decor />
            {paths}
            <path d={curve(pos(ch.quests.at(-1)!)!, CP)} fill="none" stroke="var(--route)" strokeWidth={2.4} strokeDasharray="6 6" strokeLinecap="round" />
          </svg>
          <div className="fogzone"><b>{ZONE2.title}</b><span>Глава 2 · с ур. {ZONE2.min_level}{D.hero.level >= ZONE2.min_level ? ' ✓' : ''}</span></div>
          {QUESTS.map(q => <Marker key={q.id} q={q} />)}
          <button type="button" className={'chestmk' + (cs.chest === 'ready' ? ' ready' : '')} style={{ left: CP.x, top: CP.y }} aria-label={`Сундук цепочки ${ch.title}`} onClick={() => open({ chest: ch.id })}><span className="box" style={{ display: 'block' }} /></button>
          <span className="mlabel" style={{ left: CP.x, top: CP.y + 26 }}>{tierOf(ch).title} сундук{cs.chest !== 'locked' && <small>{chestLbl}</small>}</span>
          <button type="button" className={'bossmk' + (D.bossOpen ? ' open' : '')} style={{ left: B.x, top: B.y }} aria-label="Страж перевала" onClick={() => open({ boss: '1' })}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={D.bossOpen ? '#B9D6A4' : '#E9A08E'} strokeWidth={2} aria-hidden="true"><path d={D.bossOpen ? 'M6 12l4 4 8-9' : 'M7 7l10 10M17 7L7 17'} /></svg>
          </button>
          <div className="bosstext" style={{ left: B.x + 36, top: B.y - 16 }}><span className="eyebrow" style={{ color: '#D97A63' }}>Страж перевала</span><span style={{ fontSize: 12.5, color: '#E8D2C0' }}>ключи {got} из {D.bossKeys.length}</span></div>
        </div></div>
      </div>
      <aside className="side">
        <div className="side-card"><h3>Журнал зоны</h3>
          <div className="zlist"><span className="eyebrow">В работе · {prog.length} / {RULES.slots}</span>{prog.length ? prog.map(q => row(q, 'prog', `${doneCount(D.qs[q.id])}/${q.tasks.length}`)) : <p className="hint">Пусто — сними заказ с доски.</p>}</div>
          <div className="zlist"><span className="eyebrow">Доступно · {avail.length}</span>{avail.map(q => row(q, 'open', q.deadline ? deadlineText(q) : TYPE[q.type][0].toLowerCase()))}</div>
          <div style={{ borderTop: '1px solid var(--line2)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="kv"><span>Пройдено</span><span style={{ color: 'var(--moss-ink)' }}>{D.seq.length}</span></div>
            <div className="kv" style={{ color: 'var(--muted)' }}><span>Под печатью</span><span>{QUESTS.filter(q => D.status[q.id] === 'locked').length}</span></div>
          </div>
        </div>
        <div className="side-card" style={{ background: '#241A12', borderColor: '#7A4A2A', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span className="chestmk" style={{ position: 'static', transform: 'none' }}><span className="box" style={{ display: 'block' }} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}><b style={{ fontFamily: 'var(--f-display)', fontSize: 15 }}>{tierOf(ch).title} сундук · {tierOf(ch).range}</b><span style={{ fontSize: 12.5, color: '#D9C293' }}>В конце цепочки «{ch.title}»: {ch.quests.map(id => QBY[id].title).join(' → ')}. Что внутри — узнаешь, когда откроешь.</span></div>
        </div>
      </aside>
    </section>
  );
}
