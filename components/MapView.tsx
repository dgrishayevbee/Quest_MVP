'use client';
// Карта зоны: метки квестов по quest.map, путь цепочки к сундуку, страж у перевала, туман следующей главы.
// Подписаны квесты, которые можно взять или сдать; у закрытых и пройденных — номер, имя по наведению.
// Непройденные дороги спрятаны: при наведении на метку проступают её дороги и подпись «откроет / нужно».
import { useEffect, useRef, useState } from 'react';
import { doneCount, type Point, type Quest } from '@/engine/src/engine';
import { CHAIN_OF, QBY, QUESTS, RULES, ZONE, ZONE2 } from '@/lib/content';
import { TYPE, deadlineText, tierOf } from '@/lib/ui';
import { Banners } from './Banners';
import { useGame } from './GameProvider';

const curve = (a: Point, b: Point, bend = 0.15) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  return `M${a.x} ${a.y} Q${mx - dy * bend} ${my + dx * bend} ${b.x} ${b.y}`;
};
const done = (n: number) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4DDC8" strokeWidth={3.2} aria-hidden="true" key={n}><path d="M5 12l5 5 9-10" /></svg>;

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

// Береговая линия острова зоны I и рельеф — оформление, не данные.
const LAND = 'M809 370C807 395 802 417 800 443C799 468 812 501 800 523C788 545 747 555 726 574C705 593 698 622 675 636C653 651 619 657 591 662C563 667 532 661 505 666C477 671 452 690 425 690C398 690 373 669 346 665C318 661 283 672 257 665C231 658 212 636 189 621C167 605 145 591 123 574C102 557 78 540 61 519C43 498 17 474 16 449C14 424 43 395 51 370C60 345 61 324 65 300C70 277 71 252 79 229C86 205 94 177 111 158C128 138 158 126 182 111C206 97 231 87 255 71C280 55 301 19 329 15C358 10 393 42 425 43C457 44 491 14 519 20C547 25 570 58 592 75C615 93 635 109 654 126C673 144 689 162 706 180C723 198 738 216 756 235C774 254 806 272 814 295C823 317 811 345 809 370Z';
const PEAKS: [number, number, number][] = [[610, 70, 26], [650, 92, 32], [692, 128, 36], [728, 160, 30], [782, 262, 30], [800, 312, 24], [760, 300, 20], [668, 160, 20], [620, 120, 18], [712, 210, 18]];
const TREES: [number, number][] = [[150, 200], [168, 214], [186, 200], [204, 216], [140, 228], [172, 238], [712, 400], [730, 414], [748, 400], [722, 432], [744, 446], [762, 424], [330, 520], [348, 530], [366, 518], [384, 532], [94, 470], [80, 448]];
const HILLS: [number, number][] = [[480, 160], [500, 290], [610, 410], [205, 420], [380, 320]];

function Terrain() {
  return (
    <>
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={3} /><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .55 0" /></filter>
        <radialGradient id="landshade" cx="50%" cy="48%" r="60%"><stop offset="60%" stopColor="#E9D7AE" /><stop offset="100%" stopColor="#CDB284" /></radialGradient>
        <clipPath id="landclip"><path d={LAND} /></clipPath>
      </defs>
      {/* море: рябь вдоль берега */}
      <g fill="none" stroke="#6E5A3C">
        <path d={LAND} strokeWidth={34} opacity=".08" />
        <path d={LAND} strokeWidth={20} opacity=".1" />
        <path d={LAND} strokeWidth={8} opacity=".18" />
      </g>
      <path d={LAND} fill="url(#landshade)" />
      <rect width="100%" height="100%" filter="url(#grain)" clipPath="url(#landclip)" opacity=".5" />
      <path d={LAND} fill="none" stroke="#5A4128" strokeWidth={2} />
      <g clipPath="url(#landclip)">
        {/* река с запада */}
        <path d="M205 118 C190 180 176 232 150 270 C124 306 92 330 50 362" fill="none" stroke="#7F9AA0" strokeWidth={4} strokeLinecap="round" opacity=".75" />
        <path d="M205 118 C190 180 176 232 150 270 C124 306 92 330 50 362" fill="none" stroke="#B9CBCB" strokeWidth={1.2} strokeLinecap="round" opacity=".6" />
        {/* холмы */}
        <g fill="none" stroke="#9A7E55" strokeWidth={1.4} opacity=".7">{HILLS.map(([x, y], n) => <path key={n} d={`M${x - 18} ${y} Q${x - 6} ${y - 12} ${x + 4} ${y}M${x - 2} ${y} Q${x + 8} ${y - 9} ${x + 18} ${y}`} />)}</g>
        {/* леса */}
        <g>{TREES.map(([x, y], n) => <g key={n}><path d={`M${x} ${y + 9}V${y + 3}`} stroke="#6E5532" strokeWidth={1.2} /><circle cx={x} cy={y} r={6} fill="#8C9A62" stroke="#5E6B3C" strokeWidth={1} /></g>)}</g>
      </g>
      {/* горы у перевала */}
      <g>{PEAKS.map(([x, y, s], n) => <g key={n}><path d={`M${x - s * .8} ${y + s * .55} L${x} ${y - s * .55} L${x + s * .8} ${y + s * .55}Z`} fill="#CDB68A" stroke="#5A4128" strokeWidth={1.4} strokeLinejoin="round" /><path d={`M${x} ${y - s * .55} L${x + s * .25} ${y + s * .55} L${x + s * .8} ${y + s * .55}Z`} fill="#A88C60" opacity=".7" /><path d={`M${x - s * .22} ${y - s * .25} L${x} ${y - s * .55} L${x + s * .2} ${y - s * .28}`} fill="none" stroke="#F4EAD4" strokeWidth={1.6} /></g>)}</g>
      {/* роза ветров в море */}
      <g transform="translate(870 640)" opacity=".75"><circle r="34" fill="none" stroke="#6E5A3C" /><circle r="26" fill="none" stroke="#6E5A3C" strokeDasharray="2 4" /><polygon points="0,-40 6,-6 0,0 -6,-6" fill="#B4523E" /><polygon points="0,40 6,6 0,0 -6,6" fill="#8A6A3C" /><polygon points="-40,0 -6,-6 0,0 -6,6" fill="#8A6A3C" /><polygon points="40,0 6,-6 0,0 6,6" fill="#8A6A3C" /><text y="-46" textAnchor="middle" fontSize="12" fill="#B4523E" fontFamily="var(--f-display)">С</text></g>
    </>
  );
}

// Туман войны: открыт круг вокруг каждого квеста, который уже не под печатью.
function Fog({ W, H, open }: { W: number; H: number; open: Point[] }) {
  return (
    <>
      <defs>
        <filter id="fogSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="38" /></filter>
        <filter id="fogNoise"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves={3} seed={9} /><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .28  0 0 0 1.4 -.3" /></filter>
        <mask id="fogMask"><rect width={W} height={H} fill="#fff" /><g filter="url(#fogSoft)">{open.map((p, n) => <circle key={n} cx={p.x} cy={p.y} r={95} fill="#000" />)}</g></mask>
      </defs>
      <g mask="url(#fogMask)" clipPath="url(#landclip)">
        <rect width={W} height={H} fill="#8E7E62" opacity=".38" />
        <rect width={W} height={H} filter="url(#fogNoise)" opacity=".55" />
      </g>
    </>
  );
}

const OPENS: Record<string, string[]> = {};
for (const q of QUESTS) for (const d of q.deps) (OPENS[d] ??= []).push(q.id);

function Marker({ q, onHover }: { q: Quest; onHover: (id: string | null) => void }) {
  const { D, open } = useGame();
  const p = q.map!, st = D.status[q.id], s = D.qs[q.id];
  const halo = st === 'open' || st === 'prog' || st === 'ready';
  const n = doneCount(s);
  const ly = st === 'done' || st === 'locked' ? 20 : 28;
  const quiet = st === 'done' || st === 'locked';
  const miss = D.reasons[q.id]?.missing ?? [], lvl = D.reasons[q.id]?.needLevel;
  const opens = (OPENS[q.id] ?? []).filter(id => D.status[id] === 'locked');
  const more = st === 'locked'
    ? [miss.length ? 'нужно: ' + miss.join(', ') : '', lvl ? 'ур. ' + lvl : ''].filter(Boolean).join(' · ')
    : st !== 'done' && opens.length ? 'откроет: ' + opens.join(', ') : '';
  return (
    <>
      <button type="button" className={`mk ${st}${halo ? ' halo' : ''}`} style={{ left: p.x, top: p.y }} aria-label={q.title} onClick={() => open({ q: q.id })}
        onMouseEnter={() => onHover(q.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(q.id)} onBlur={() => onHover(null)}>
        <span className="shield">{st === 'done' ? done(0) : st === 'open' ? '!' : '?'}</span>
      </button>
      {quiet && <span className="mcode" style={{ left: p.x, top: p.y + 18 }}>{q.id}</span>}
      <span className={'mlabel' + (quiet ? ' hov' : '')} style={{ left: p.x, top: p.y + ly }}>
        {q.title}
        {(st === 'prog' || st === 'ready') && <small>{st === 'ready' ? 'можно сдать' : 'цель · ' + n + '/' + q.tasks.length}</small>}
        {more && <small className="more">{more}</small>}
      </span>
    </>
  );
}

export function MapView() {
  const { D, open } = useGame();
  const M = ZONE.map!, W = M.size.w, H = M.size.h;
  const [box, k] = useFit(W);
  const [hover, setHover] = useState<string | null>(null);
  const ch = ZONE.chains[0], cs = D.chains[ch.id], CP = M.chest[ch.id], B = M.boss;
  const pos = (id: string) => QBY[id]?.map;
  // Дороги по зависимостям: пройденная — сплошная; непройденная видна только у метки под курсором; цепочка к сундуку — красная.
  const roads: React.ReactNode[] = [], route: React.ReactNode[] = [];
  for (const q of QUESTS) for (const d of q.deps) {
    const a = pos(d), b = q.map;
    if (!a || !b) continue;
    const key = d + '>' + q.id, ok = D.qs[d].done;
    const lit = hover === d || hover === q.id;
    if (CHAIN_OF[q.id] && CHAIN_OF[q.id] === CHAIN_OF[d]) route.push(<path key={'r' + key} d={curve(a, b)} fill="none" stroke="var(--route)" strokeWidth={3.2} strokeLinecap="round" />);
    if (!ok && !lit) continue;
    roads.push(ok && !lit
      ? <g key={key}><path d={curve(a, b)} fill="none" stroke="#F1E2C0" strokeWidth={6} strokeLinecap="round" opacity=".6" /><path d={curve(a, b)} fill="none" stroke="#6E5232" strokeWidth={2.4} strokeLinecap="round" /></g>
      : <path key={key} d={curve(a, b)} fill="none" stroke="#7A5A2E" strokeWidth={2.4} strokeDasharray="3 6" strokeLinecap="round" />);
  }
  const keyRoad = pos(ZONE.boss.keys[1]) ?? pos(ZONE.boss.keys[0]);
  const revealed = QUESTS.filter(q => D.status[q.id] !== 'locked' && q.map).map(q => q.map!);
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
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Зона I · {ZONE.title}</h2>
        <div className="map-box" ref={box} style={{ height: H * k }}><div className="map map-fit" style={{ width: W, height: H, transform: k < 1 ? `scale(${k})` : undefined }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <Terrain />
            {roads}
            {keyRoad && <path d={curve(keyRoad, B, -0.1)} fill="none" stroke="#5A4128" strokeWidth={2} strokeDasharray="7 5" strokeLinecap="round" />}
            {route}
            <path d={curve(pos(ch.quests.at(-1)!)!, CP)} fill="none" stroke="var(--route)" strokeWidth={2.6} strokeDasharray="7 6" strokeLinecap="round" />
            <Fog W={W} H={H} open={revealed} />
            {(M.regions ?? []).map(r => <text key={r.name} x={r.x} y={r.y} textAnchor="middle" className="region">{r.name.toUpperCase()}</text>)}
          </svg>
          <div className="fogzone"><b>{ZONE2.title}</b><span>глава 2 · с ур. {ZONE2.min_level}{D.hero.level >= ZONE2.min_level ? ' ✓' : ''}</span><span className="arrow">→</span></div>
          <div className="legend cartouche"><span><i className="lg open" />можно взять</span><span><i className="lg prog" />цель, в работе</span><span><i className="lg locked" />под печатью</span><span><i className="lg done" />пройдено</span><span><i className="lg route" />путь к сундуку</span><em>Наведи на метку — проступят её дороги</em></div>
          {QUESTS.map(q => <Marker key={q.id} q={q} onHover={setHover} />)}
          <button type="button" className={'chestmk' + (cs.chest === 'ready' ? ' ready' : '')} style={{ left: CP.x, top: CP.y }} aria-label={`Сундук цепочки ${ch.title}`} onClick={() => open({ chest: ch.id })}><span className="box" style={{ display: 'block' }} /></button>
          <span className="mlabel" style={{ left: CP.x, top: CP.y + 26 }}>{tierOf(ch).title} сундук{cs.chest !== 'locked' && <small>{chestLbl}</small>}</span>
          <button type="button" className={'bossmk' + (D.bossOpen ? ' open' : '')} style={{ left: B.x, top: B.y }} aria-label="Страж перевала" onClick={() => open({ boss: '1' })}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={D.bossOpen ? '#B9D6A4' : '#E9A08E'} strokeWidth={2} aria-hidden="true"><path d={D.bossOpen ? 'M6 12l4 4 8-9' : 'M7 7l10 10M17 7L7 17'} /></svg>
          </button>
          <div className="bosstext" style={{ left: B.x + 34, top: B.y - 4 }}><span className="eyebrow" style={{ color: '#F0A28C' }}>Перевал · страж</span><span style={{ fontSize: 12.5, color: '#F1E2C0' }}>ключи {got} из {D.bossKeys.length}</span></div>
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
