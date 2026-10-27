'use client';
// Доска: заказы (status = open), печати (locked), «Разыскивается» и журнал сбоку.
import type { Quest } from '@/engine/src/engine';
import { CHAIN_OF, QUESTS, ZONE2 } from '@/lib/content';
import { ROMAN, TYPE, deadlineText, lockText, tierOf } from '@/lib/ui';
import { Banners } from './Banners';
import { useGame } from './GameProvider';
import { Journal } from './Journal';
import { useActions } from './useActions';

function OrderNote({ q }: { q: Quest }) {
  const { D, open } = useGame();
  const { take, full } = useActions();
  const v = D.values[q.id], ch = CHAIN_OF[q.id], [rt, rc] = TYPE[q.type];
  return (
    <article className="note"><span className="pin" aria-hidden="true" /><span className={'ribbon ' + rc}>{rt}</span>
      <h3>{q.title}</h3><span className="brief">{q.brief}</span>
      {q.deadline && <span className="flag deadline">Срочно · {deadlineText(q)}</span>}
      {ch && <span className="flag chain">Цепочка «{ch.title}» · {tierOf(ch).title.toLowerCase()} сундук</span>}
      <div className="foot"><span className="x">+{v.xp} XP</span><span className="g">+{v.gold} зол.</span></div>
      <div className="acts">
        <button className="btn rust small" type="button" disabled={full} onClick={() => take(q.id)}>Снять заказ</button>
        <button className="btn pghost small" type="button" style={{ color: 'var(--pmuted)' }} onClick={() => open({ q: q.id })}>Подробнее</button>
      </div>
    </article>
  );
}

function SealNote({ q }: { q: Quest }) {
  const { D, open } = useGame();
  const r = D.reasons[q.id], n = r.missing.length;
  return (
    <button type="button" className="note sealed" onClick={() => open({ q: q.id })}><span className="pin" aria-hidden="true" />
      <span className="q">{q.title}</span>
      {n ? <span className="waxseal">{ROMAN[Math.min(n, 5)]}</span> : <span className="waxseal lvl">ур. {r.needLevel}</span>}
      <span className="cond">Печать снимется, когда {lockText(D, q.id)}</span>
    </button>
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
  return (
    <section className="view" role="tabpanel" id="view-board">
      <Banners />
      <div className="main">
        <div className="board-head"><b>Заказы гильдии</b><span>{open.length} открыто · {locked.length} под печатью · 1 босс</span></div>
        <div className="board">
          {open.map(q => <OrderNote key={q.id} q={q} />)}
          {locked.map(q => <SealNote key={q.id} q={q} />)}
          <WantedNote />
        </div>
      </div>
      <aside className="side">
        <Journal />
        <div className="side-card"><h3>Как это работает</h3><p className="hint">Сними заказ — он займёт слот в журнале. Отмечай задачи прямо там. Награда считается из того, что ты делаешь: чтение, тренировка, бой с реальными людьми или оформление.</p></div>
      </aside>
    </section>
  );
}
