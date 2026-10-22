'use client';
// Журнал: слоты с квестами в работе и свободные слоты.
import { QBY, RULES } from '@/lib/content';
import { ROMAN } from '@/lib/ui';
import { useGame } from './GameProvider';
import { TaskList } from './TaskList';

export function Journal() {
  const { D, open } = useGame();
  const free = Array.from({ length: Math.max(0, RULES.slots - D.prog.length) }, (_, k) => D.prog.length + k);
  return (
    <div className="journal">
      <div className="jh"><b>Журнал</b><span className="mono" style={{ fontSize: 12, color: '#C9A97A' }}>{D.prog.length} / {RULES.slots} слота</span></div>
      {D.prog.map((id, n) => {
        const q = QBY[id], s = D.qs[id], ready = D.status[id] === 'ready';
        return (
          <div className="jslot" key={id}>
            <div className="row"><span>СЛОТ {ROMAN[n + 1]} · {ready ? 'МОЖНО СДАТЬ' : 'В РАБОТЕ'}</span><span className="ticks">{q.tasks.map(t => <i key={t.id} className={s.tasks[t.id] ? 'on' : ''} />)}</span></div>
            <h3><button type="button" style={{ all: 'unset', cursor: 'pointer' }} onClick={() => open({ q: id })}>{q.title}</button></h3>
            <TaskList q={q} interactive />
            <span className="win">Победа: {q.win}</span>
            {ready
              ? <button className="btn rust" type="button" onClick={() => open({ q: id, submit: '1' })}>Сдать квест</button>
              : <button className="btn pghost" type="button" disabled>Сдать квест · отметь все задачи</button>}
          </div>
        );
      })}
      {free.map(n => <div className="jempty" key={'free' + n}><span className="eyebrow" style={{ color: '#C9A97A' }}>Слот {ROMAN[n + 1]}</span><b>Свободен</b><span>Сними заказ с доски</span></div>)}
    </div>
  );
}
