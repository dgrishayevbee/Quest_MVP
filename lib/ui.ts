// Подписи и форматирование для плашек. Здесь нет игровой логики: только тексты из State.
import { doneCount, type Chain, type Quest, type State } from '@/engine/src/engine';
import { QBY, QUESTS, RULES, ZONE } from './content';

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export const TYPE: Record<Quest['type'], [string, string]> = { main: ['ОСНОВНОЙ', 'r-main'], side: ['ПОБОЧНЫЙ', 'r-side'], prep: ['ПОДГОТОВКА', 'r-prep'] };
export const STL = { done: 'сдан', prog: 'в работе', ready: 'можно сдать', open: 'доступен', locked: 'под печатью' } as const;
export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const deadlineText = (q: Quest) => (q.deadline ? 'до главы ' + q.deadline.split('-')[1] : '');
export const tierOf = (ch: Chain) => RULES.tiers[ch.chest!];
export const pct = (v: number) => Math.min(100, v * 100) + '%';

export function lockText(D: State, id: string): string {
  const r = D.reasons[id];
  if (!r) return '';
  const p: string[] = [];
  if (r.missing.length) p.push('сдай ' + r.missing.map(d => '«' + QBY[d].title + '»').join(' и '));
  if (r.needLevel) p.push('достигни ур. ' + r.needLevel);
  return p.join(', ');
}

export function statusText(D: State, notes: string): string {
  const lines = QUESTS.map(q => {
    const st = D.status[q.id];
    let l = `${q.id} ${q.title}: ${STL[st]}`;
    if (st !== 'locked') l += ` (${doneCount(D.qs[q.id])}/${q.tasks.length})`;
    return l;
  });
  const ch = ZONE.chains[0];
  return `Путь проводника, статус на ${new Date().toLocaleDateString('ru-RU')}\nУровень ${D.hero.level}, ${D.hero.xp} XP, золото ${D.gold}${D.hero.blocked ? ', ждёт испытания' : ''}\n${lines.join('\n')}\nСундук «${ch.title}»: ${D.chains[ch.id].chest}\nСтраж: ${D.bossKeys.filter(k => k.ok).length}/${D.bossKeys.length} ключей\n\nЗаметки по прототипу:\n${notes || '—'}`;
}
