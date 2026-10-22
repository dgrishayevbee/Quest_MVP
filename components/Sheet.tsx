'use client';
// Окно-пергамент поверх любого экрана: квест (?q=), страж (?boss), сундук (?chest=). Закрывается по ×, фону и Esc.
import { useEffect, useState } from 'react';
import { swapValue } from '@/engine/src/engine';
import { C, CHAIN_OF, KIND, QBY, RULES, ZONE, ZONE2 } from '@/lib/content';
import { ROMAN, TYPE, deadlineText, fmt, lockText, tierOf } from '@/lib/ui';
import { useGame } from './GameProvider';
import { CheckList, TaskList } from './TaskList';
import { useActions } from './useActions';

const STATUS_KICKER = { done: 'сдан', prog: 'в работе', ready: 'можно сдать', open: 'можно взять', locked: 'под печатью' } as const;

function SubmitForm({ id }: { id: string }) {
  const { D, open } = useGame();
  const { submit } = useActions();
  const [note, setNote] = useState(''), [links, setLinks] = useState('');
  const v = D.values[id];
  return (
    <form id="sub-form" style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }} onSubmit={e => { e.preventDefault(); submit(id, note.trim(), links.trim()); }}>
      <label className="f" htmlFor="sub-note">Что сделал — 1–3 предложения{v.trial ? '. Для тренировки: с кем и что вышло' : ''}</label>
      <textarea id="sub-note" required autoFocus value={note} onChange={e => setNote(e.target.value)} />
      <label className="f" htmlFor="sub-links">Ссылки на результат (по желанию)</label>
      <input type="text" id="sub-links" value={links} onChange={e => setLinks(e.target.value)} />
      <div className="acts"><button className="btn rust" type="submit">Сдать: +{v.xp} XP, +{v.gold} зол.</button><button className="btn ghost small" type="button" onClick={() => open({ q: id })}>Отмена</button></div>
    </form>
  );
}

function QuestBody({ id }: { id: string }) {
  const { D, modal, open } = useGame();
  const { take, drop, reopen, full } = useActions();
  const q = QBY[id], st = D.status[id], v = D.values[id], ch = CHAIN_OF[id], [rt] = TYPE[q.type];
  const extra: string[] = [];
  if (ch) extra.push(`цепочка «${ch.title}» → ${tierOf(ch).title.toLowerCase()} сундук`);
  if (q.deadline) extra.push(deadlineText(q));
  if (v.trial && D.hero.level >= RULES.level.trial_from_level) extra.push('засчитывается как испытание');
  const missing = D.reasons[id]?.missing.length ?? 0;
  return (
    <>
      <span className="kicker">{rt.charAt(0) + rt.slice(1).toLowerCase()} · {STATUS_KICKER[st]}</span>
      <h2 id="sheet-title">{q.title}</h2>
      <p className="brief">{q.brief}</p>
      {st === 'locked' && <div className="lock"><span className="waxseal">{missing ? ROMAN[Math.min(missing, 5)] : 'ур.'}</span><p>Печать снимется, когда {lockText(D, id)}.</p></div>}
      <TaskList q={q} interactive={st === 'prog' || st === 'ready'} />
      <p className="wintext"><b>Победа:</b> {q.win}</p>
      <div className="reward"><span className="x2">+{v.xp} XP</span><span className="g2">+{v.gold} золота</span>{extra.length > 0 && <em>{extra.join(' · ')}</em>}</div>
      <details><summary>Как посчитана награда</summary><ul>{v.parts.map((p, n) => <li key={n}>{KIND[p.kind].label.toLowerCase()} → +{Math.round(p.xp)} XP, +{Math.round(p.gold * 10) / 10} зол.</li>)}</ul></details>
      <div className="acts">
        {st === 'open' && <><button className="btn rust" type="button" disabled={full} onClick={() => take(id)}>Снять заказ</button><span className="note-t">{full ? 'Оба слота заняты.' : 'Займёт слот в журнале.'}</span></>}
        {st === 'prog' && <><button className="btn pghost" type="button" disabled>Сдать · отметь все задачи</button><button className="btn ghost small" type="button" onClick={() => drop(id)}>Отложить</button></>}
        {st === 'ready' && !modal.submit && <><button className="btn rust" type="button" onClick={() => open({ q: id, submit: '1' })}>Сдать квест</button><button className="btn ghost small" type="button" onClick={() => drop(id)}>Отложить</button></>}
        {st === 'ready' && modal.submit && <SubmitForm id={id} />}
        {st === 'done' && <><button className="btn ghost small" type="button" disabled={full} onClick={() => reopen(id)}>Вернуть в работу</button><span className="note-t">XP и золото снимутся до повторной сдачи.</span></>}
      </div>
    </>
  );
}

function BossBody() {
  const { D } = useGame();
  return (
    <>
      <span className="kicker">Босс зоны I</span><h2 id="sheet-title">Страж перевала</h2>
      <p className="brief">Пропустит в главу 2 «{ZONE2.title}» — к живым собственникам — когда соберёшь ключи и дорастёшь до ур. {ZONE2.min_level}.</p>
      <span className="lbl">Ключи</span>
      <CheckList items={[...D.bossKeys.map(k => ({ text: QBY[k.id].title, ok: k.ok })), { text: `Уровень ${ZONE2.min_level} (сейчас ${D.hero.level})`, ok: D.hero.level >= ZONE2.min_level }]} />
      <p className="wintext">Награда: путь в главу 2, где ждут большой и легендарный сундуки.</p>
    </>
  );
}

function ChestBody({ chain }: { chain: string }) {
  const { D } = useGame();
  const { roll, receive, swap } = useActions();
  const [photo, setPhoto] = useState('');
  const ch = ZONE.chains.find(c => c.id === chain)!, c = D.chains[ch.id], tier = tierOf(ch);
  const item = c.rec ? C.pool.find(p => p.id === c.rec!.item) : undefined;
  return (
    <>
      <span className="kicker">Сундук цепочки «{ch.title}» · пул — заглушки</span><h2 id="sheet-title">{tier.title} сундук</h2>
      {c.chest === 'locked' && <><p className="brief">Пройди цепочку «{ch.title}», чтобы открыть.</p><CheckList items={ch.quests.map(id => ({ text: QBY[id].title, ok: D.qs[id].done }))} /></>}
      {c.chest === 'empty_pool' && <p className="brief">В пуле меньше 3 вещей. Пополни список желаний.</p>}
      {c.chest === 'ready' && <><p className="brief">Внутри одна из {D.pool.filter(p => p.tier === ch.chest).length} вещей ценой {tier.range}. Какая — узнаешь, когда откроешь. Переиграть нельзя.</p><div className="acts"><button className="btn rust" type="button" onClick={() => roll(ch.id)}>Открыть сундук</button></div></>}
      {c.chest === 'opened' && item && <>
        <p className="brief">Выпало: <b>{item.title}</b>, ~{fmt(item.price)} ₸. Купи в течение 7 дней и отметь, или обменяй на золото.</p>
        <label className="f" htmlFor="photo">Ссылка на фото (по желанию)</label><input type="text" id="photo" value={photo} onChange={e => setPhoto(e.target.value)} />
        <div className="acts"><button className="btn moss" type="button" onClick={() => receive(ch.id, photo.trim())}>Получил</button><button className="btn ghost small" type="button" onClick={() => swap(ch.id)}>Обменять на {fmt(swapValue(item, RULES))} зол.</button></div>
      </>}
      {c.chest === 'received' && <p className="brief">Вещь на полке трофеев: {item?.title}.</p>}
      {c.chest === 'swapped' && <p className="brief">Обменян на {fmt(c.rec!.gold!)} золота. Вещь вернулась в пул.</p>}
    </>
  );
}

export function Sheet() {
  const { modal, close } = useGame();
  const chest = modal.chest && ZONE.chains.some(c => c.id === modal.chest) ? modal.chest : null;
  const q = !chest && modal.q && QBY[modal.q] ? modal.q : null;
  const boss = !chest && !q && modal.boss;
  const isOpen = !!(chest || q || boss);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);
  if (!isOpen) return null;
  return (
    <div className="overlay" id="overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <span className="pin" aria-hidden="true" /><button className="x" type="button" aria-label="Закрыть" onClick={close}>×</button>
        {chest ? <ChestBody key={chest} chain={chest} /> : q ? <QuestBody key={q} id={q} /> : <BossBody />}
      </div>
    </div>
  );
}
