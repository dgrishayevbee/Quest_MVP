'use client';
// Задачи квеста чекбоксами. Галочка → task_set. Следующая невыполненная задача подсвечена.
import type { Quest } from '@/engine/src/engine';
import { useGame } from './GameProvider';

export function TaskList({ q, interactive }: { q: Quest; interactive: boolean }) {
  const { D, act } = useGame();
  const s = D.qs[q.id];
  const next = q.tasks.find(t => !s.tasks[t.id] && !t.optional);
  return (
    <ul className="ptasks">
      {q.tasks.map(t => {
        const cls = (s.tasks[t.id] ? 'done' : interactive && t === next ? 'next' : '') + (interactive ? '' : ' off');
        return (
          <li key={t.id}><label className={cls}>
            <input type="checkbox" id={'t-' + t.id} data-q={q.id} data-task={t.id} checked={!!s.tasks[t.id]} disabled={!interactive}
              onChange={e => act({ t: 'task_set', q: q.id, task: t.id, v: e.target.checked })} />
            {t.text}{t.optional ? ' (по желанию)' : ''}
          </label></li>
        );
      })}
    </ul>
  );
}

// Список только для чтения: ключи стража, квесты цепочки.
export function CheckList({ items }: { items: { text: string; ok: boolean }[] }) {
  return (
    <ul className="ptasks">
      {items.map(it => <li key={it.text}><label className={(it.ok ? 'done' : '') + ' off'}><input type="checkbox" disabled checked={it.ok} readOnly />{it.text}</label></li>)}
    </ul>
  );
}
