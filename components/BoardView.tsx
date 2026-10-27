'use client';
// Доска: «Что дальше», путь главы, заказы (status = open), «Разыскивается», полка печатей (locked) и журнал сбоку.
import { nextStep, recommended, type Quest } from '@/engine/src/engine';
import { C, CHAIN_OF, PATH, QBY, QUESTS, ZONE, ZONE2 } from '@/lib/content';
import { ROMAN, TYPE, deadlineText, lockText, tierOf } from '@/lib/ui';
import { Banners } from './Banners';
import { useGame } from './GameProvider';
import { Journal } from './Journal';
import { useActions } from './useActions';

function OrderNote({ q, advised }: { q: Quest; advised: boolean }) {
  const { D, open } = useGame();
  const { take, full } = useActions();
  const v = D.values[q.id], ch = CHAIN_OF[q.id], [rt, rc] = TYPE[q.type];
  return (
    <article className={'note' + (advised ? ' advised' : '')}><span className="pin" aria-hidden="true" /><span className={'ribbon ' + rc}>{rt}</span>
      {advised && <span className="advice">Советую</span>}
      <h3>{q.title}</h3><span className="brief">{q.brief}</span>
      {q.deadline && <span className="flag deadline">Срочно · {deadlineText(q)}</span>}
      {ch && <span className="flag chain">Цепочка «{ch.title}» · {tierOf(ch).title.toLowerCase()} сундук</span>}
      <div className="foot"><span className="x">+{v.xp} XP</span><span className="g">+{v.gold} зол.</span></div>
      <div className="acts">
        <button className="btn rust small" type="button" disabled={full} onClick={() => take(q.id)}>Снять заказ</button>
        <button className="more" type="button" onClick={() => open({ q: q.id })}>Подробнее</button>
      </div>
    </article>
  );
}

function SealNote({ q }: { q: Quest }) {
  const { D, open } = useGame();
  const r = D.reasons[q.id], n = r.missing.length;
  return (
    <button type="button" className="seal-item" onClick={() => open({ q: q.id })} title={'Печать снимется, когда ' + lockText(D, q.id)}>
      {n ? <span className="waxseal">{ROMAN[Math.min(n, 5)]}</span> : <span className="waxseal lvl">ур. {r.needLevel}</span>}
      <span className="q">{q.title}</span>
    </button>
  );
}

// «Что дальше»: табличка над доской. Ход выбирает движок (nextStep), здесь только текст и кнопка.
function NextPlaque() {
  const { D, open } = useGame();
  const { take } = useActions();
  const s = nextStep(D, C, PATH);
  let text = 'Все заказы взяты. Работай по журналу.', btn: [string, () => void] | null = null;
  if (s.kind === 'chest') { text = `Сундук цепочки «${ZONE.chains.find(c => c.id === s.chain)!.title}» готов`; btn = ['Открыть сундук', () => open({ chest: s.chain })]; }
  else if (s.kind === 'submit') { text = `«${QBY[s.q].title}» можно сдать`; btn = ['Сдать квест', () => open({ q: s.q, submit: '1' })]; }
  else if (s.kind === 'task') { text = QBY[s.q].tasks.find(t => t.id === s.task)!.text; btn = ['Открыть квест', () => open({ q: s.q })]; }
  else if (s.kind === 'take') { text = `Сними заказ «${QBY[s.q].title}»`; btn = ['Снять заказ', () => take(s.q)]; }
  else if (s.kind === 'trial') text = `Испытание уровня ${D.hero.level + 1}: сдай квест с тренировкой или боем`;
  else if (s.kind === 'boss') { text = 'Страж пропускает: ворота в главу 2 открыты'; btn = ['К стражу', () => open({ boss: '1' })]; }
  return (
    <div className="board-head next-plaque">
      <span className="k">{s.kind === 'task' ? 'Следующий ход · ' + QBY[s.q].title : 'Следующий ход'}</span>
      <b>{text}</b>
      {btn && <button className="btn rust small" type="button" onClick={btn[1]}>{btn[0]}</button>}
    </div>
  );
}

// Путь главы: печати в порядке прохождения, страж в конце.
function ChapterPath() {
  const { D, open } = useGame();
  const done = PATH.filter(id => D.status[id] === 'done').length;
  return (
    <div className="chapter-path" aria-label={`Путь главы: сдано ${done} из ${PATH.length}`}>
      <ol>
        {PATH.map(id => {
          const st = D.status[id], cls = st === 'done' ? 'done' : st === 'prog' || st === 'ready' ? 'now' : st === 'open' ? 'open' : '';
          return <li key={id} className={cls}><button type="button" onClick={() => open({ q: id })} title={QBY[id].title + (CHAIN_OF[id]?.chest && CHAIN_OF[id].quests.at(-1) === id ? ' · сундук' : '')}>{id}</button></li>;
        })}
        <li className={'boss' + (D.bossOpen ? ' done' : '')}><button type="button" onClick={() => open({ boss: '1' })} title="Страж перевала"><span>⚑</span></button></li>
      </ol>
      <span className="pp">сдано {done} из {PATH.length} · ключей у стража {D.bossKeys.filter(k => k.ok).length} из {D.bossKeys.length}</span>
    </div>
  );
}

function WantedNote() {
  const { D, open } = useGame();
  return (
    <button type="button" className="note wanted" onClick={() => open({ boss: '1' })}><span className="pin" aria-hidden="true" />
      <span className="w">РАЗЫСКИВАЕТСЯ</span><h3 style={{ fontSize: 17 }}>Страж перевала</h3>
      <span className="cond" style={{ fontSize: 12.5, color: '#4A3A26' }}>Пропустит в главу 2 «{ZONE2.title}» с {D.bossKeys.length} ключами и на ур. {ZONE2.min_level}</span>
      <div className="keys">{D.bossKeys.map(k => <span key={k.id} className={k.ok ? 'ok' : ''}>{k.id}</span>)}</div>
    </button>
  );
}

export function BoardView() {
  const { D } = useGame();
  const open = QUESTS.filter(q => D.status[q.id] === 'open');
  const locked = QUESTS.filter(q => D.status[q.id] === 'locked');
  const adv = recommended(D, C, PATH);
  open.sort((a, b) => (a.id === adv ? -1 : b.id === adv ? 1 : PATH.indexOf(a.id) - PATH.indexOf(b.id)));
  return (
    <section className="view" role="tabpanel" id="view-board">
      <Banners />
      <div className="main">
        <NextPlaque />
        <div className="board">
          <ChapterPath />
          {open.map(q => <OrderNote key={q.id} q={q} advised={q.id === adv} />)}
          <WantedNote />
          {locked.length > 0 && (
            <div className="seal-shelf">
              <span className="sh">Под печатью · {locked.length}</span>
              <div className="items">{locked.map(q => <SealNote key={q.id} q={q} />)}</div>
            </div>
          )}
        </div>
      </div>
      <aside className="side">
        <Journal />
        <div className="side-card"><h3>Как это работает</h3><p className="hint">Сними заказ — он займёт слот в журнале. Отмечай задачи прямо там. Награда считается из того, что ты делаешь: чтение, тренировка, бой с реальными людьми или оформление.</p></div>
      </aside>
    </section>
  );
}
