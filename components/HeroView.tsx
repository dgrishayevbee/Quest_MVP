'use client';
// Персонаж: панель героя (итоги, портрет, трофеи), казна, летопись, «до уровня», заметки и экспорт.
import { useRef, useState, type ReactNode } from 'react';
import { xpForLevel } from '@/engine/src/engine';
import { C, QBY, RULES, ZONE, ZONE2 } from '@/lib/content';
import { fmt, pct, statusText, tierOf } from '@/lib/ui';
import { Banners } from './Banners';
import { useGame } from './GameProvider';
import { useActions } from './useActions';

const RewardIcon = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M4 13h16M12 9v11M8 9c-2-3 1-5 4 0 3-5 6-3 4 0" /></svg>;
const faint = { color: '#7E6A4A', fontFamily: 'var(--f-body)', fontSize: 14, fontWeight: 400 } as const;

function Stat({ label, val, sub, gold }: { label: string; val: number; sub: string; gold?: boolean }) {
  return <div className="hslot"><span className={'ic' + (gold ? ' gold' : '')} style={{ color: gold ? 'var(--gold-hi)' : 'var(--ink)' }}>{val}</span><div><small>{label}</small><b>{sub}</b></div></div>;
}

function HeroPanel() {
  const { D } = useGame();
  const h = D.hero, cur = xpForLevel(h.level), nxt = xpForLevel(h.level + 1);
  const ch = ZONE.chains[0], cs = D.chains[ch.id], got = cs.rec?.state === 'received';
  const trophies: ReactNode[] = [];
  if (got) trophies.push(<div className="hslot" key="chest"><span className="ic gold"><RewardIcon /></span><div><small>Сундук «{ch.title}»</small><b>{C.pool.find(p => p.id === cs.rec!.item)?.title}</b><em>{tierOf(ch).title.toLowerCase()}</em></div></div>);
  D.shop.forEach((s, n) => trophies.push(<div className="hslot" key={'shop' + n}><span className="ic"><RewardIcon /></span><div><small>Казна</small><b>{C.shop.find(x => x.id === s.item)?.title}</b><em>{s.gold} золота</em></div></div>));
  if (!got) trophies.unshift(<div className="hslot" key="chest-slot"><span className="ic empty" style={{ color: '#4E4232' }}><RewardIcon /></span><div><small>Слот сундука «{ch.title}»</small><b style={faint}>{cs.chest === 'locked' ? `осталось ${cs.total - cs.done} из ${cs.total} квестов` : 'сундук ждёт на карте'}</b></div></div>);
  for (let n = trophies.length; n < 4; n++) trophies.push(<div className="hslot" key={'empty' + n}><span className="ic empty" /><div><small>Трофей</small><b style={faint}>пустой слот</b></div></div>);
  return (
    <div className="heropanel">
      <div className="hcol"><span className="eyebrow">Итоги</span>
        <Stat label="Заказов сдано" val={D.seq.length} sub="квестов" />
        <Stat label="Действий завершено" val={D.tasksDone} sub="задач" />
        <Stat label="Внешних событий" val={D.battles} sub="боёв с людьми" />
        <Stat label="Наград получено" val={D.received} sub="вещей и плюшек" gold />
      </div>
      <div className="hcenter">
        <div className="portrait"><svg width="150" height="170" viewBox="0 0 120 160" aria-hidden="true"><path d="M60 18 C40 18 30 38 30 58 L27 98 C20 110 13 130 11 160 L109 160 C107 130 100 110 93 98 L90 58 C90 38 80 18 60 18 Z" fill="#3A2E20" stroke="#8A6A3C" strokeWidth={1.5} /><ellipse cx="60" cy="66" rx="16" ry="20" fill="#100C08" /><path d="M44 110 L60 130 L76 110" fill="none" stroke="#D2A54A" strokeWidth={2} /></svg></div>
        <span className="plvl"><span>{h.level}</span></span>
        <span className="name">Денис</span><span className="cls">Проводник собственника</span>
        <div className="hbar"><div className="bar"><i style={{ width: pct((h.xp - cur) / (nxt - cur)) }} /></div><span>{fmt(h.xp)} / {fmt(nxt)} XP до ур. {h.level + 1}</span></div>
        {h.blocked && <span className="trialtag">ждёт испытания</span>}
      </div>
      <div className="hcol"><span className="eyebrow">Трофеи</span>{trophies.slice(0, 4)}</div>
    </div>
  );
}

function Treasury() {
  const { D } = useGame();
  const { buy } = useActions();
  return (
    <section className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h3>Казна</h3><span className="mono" style={{ color: 'var(--gold-hi)', fontSize: 20, fontWeight: 700 }}>{fmt(D.gold)}</span></div>
      <p className="hint">Золото за работу. Витрина и курс {RULES.rate_kzt_per_gold.value} ₸ за золото — заглушки.</p>
      {C.shop.map(it => <div className="shoprow" key={it.id}><span>{it.title}</span><span className="mono" style={{ flex: 'none', color: 'var(--gold-hi)', fontSize: 13 }}>{it.gold}</span><button className="btn small" type="button" disabled={D.gold < it.gold} onClick={() => buy(it.id)}>Купить</button></div>)}
    </section>
  );
}

function Chronicle() {
  const { D } = useGame();
  const rows = D.archive.slice().reverse().filter(a => D.qs[a.q].done && D.qs[a.q].at === (a.at || null));
  return (
    <section className="chron"><span className="eyebrow" style={{ color: '#7A5A2A' }}>Летопись · что сдано</span>
      {rows.length ? rows.map((a, n) => <div className="e" key={n}><b>{QBY[a.q].title} · +{D.values[a.q].xp} XP</b><p>{a.note}</p>{a.links && <span style={{ fontSize: 12, color: 'var(--pmuted)', overflowWrap: 'anywhere' }}>{a.links}</span>}</div>) : <p style={{ margin: 0 }}>Пока пусто.</p>}
    </section>
  );
}

function NextLevel() {
  const { D } = useGame();
  const h = D.hero, needXp = Math.max(0, xpForLevel(h.level + 1) - h.xp), got = D.bossKeys.filter(k => k.ok).length, from = RULES.level.trial_from_level;
  return (
    <section className="card warm"><h3>До уровня {h.level + 1}</h3>
      <span className={'check' + (needXp === 0 ? ' ok' : '')}><i />Опыт: ещё {fmt(needXp)} XP</span>
      {h.level >= from
        ? <span className={'check' + (!h.needTrial ? ' ok' : '')}><i />Испытание: сдать квест с тренировкой или боем</span>
        : <span className="check" style={{ color: 'var(--muted)' }}><i />С уровня {from} для повышения понадобится испытание</span>}
      <h3 style={{ marginTop: 6 }}>До главы 2</h3>
      <span className={'check' + (got === D.bossKeys.length ? ' ok' : '')}><i />Ключи стража: {got} из {D.bossKeys.length}</span>
      <span className={'check' + (h.level >= ZONE2.min_level ? ' ok' : '')}><i />Уровень {ZONE2.min_level}</span>
    </section>
  );
}

function Notes() {
  const { D, events, notes, setNotes, toast } = useGame();
  const [fallback, setFallback] = useState<string | null>(null);
  const fb = useRef<HTMLTextAreaElement>(null);
  const copy = (text: string, ok: string) => {
    const manual = () => { setFallback(text); setTimeout(() => { fb.current?.focus(); fb.current?.select(); }); toast('Выдели текст и скопируй вручную'); };
    try { navigator.clipboard.writeText(text).then(() => toast(ok)).catch(manual); } catch { manual(); }
  };
  return (
    <section className="card notes" style={{ width: '100%' }}><h3>Заметки по прототипу</h3>
      <label className="hint" htmlFor="notes">Что неудобно, непонятно или считается не так. Попадёт в статус для Claude.</label>
      <textarea id="notes" placeholder="Например: квест открылся раньше, чем я ожидал" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="tools">
        <button className="btn" type="button" onClick={() => copy(statusText(D, notes), 'Статус скопирован. Вставь его в чат с Claude')}>Скопировать статус для Claude</button>
        <button className="btn ghost" type="button" onClick={() => copy(JSON.stringify({ version: RULES.version, exported: new Date().toISOString(), events, notes }), 'Журнал событий скопирован')}>Скопировать журнал событий (JSON)</button>
      </div>
      <textarea ref={fb} hidden={fallback === null} readOnly aria-label="Статус для копирования" value={fallback ?? ''} />
    </section>
  );
}

export function HeroView() {
  return (
    <section className="view" role="tabpanel" id="view-hero">
      <Banners />
      <HeroPanel />
      <div className="hgrid"><Treasury /><Chronicle /><NextLevel /></div>
      <Notes />
    </section>
  );
}
