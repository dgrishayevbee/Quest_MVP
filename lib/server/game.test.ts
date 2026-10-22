import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, loadJson } from '../../engine/node/load.ts';
import { swapValue, type GameEvent } from '../../engine/src/engine.ts';
import { applyIntent, loadState, type EventStore } from './game.ts';
import { fromRow, toRow, type EventRow } from './rows.ts';

const c = loadContent(), seed: GameEvent[] = loadJson('content/seed.json');

// Хранилище в памяти, которое ведёт себя как таблица events: строки, дата от «базы», порядок записи.
function memory(): EventStore & { rows: EventRow[] } {
  let n = 0;
  const rows: EventRow[] = [];
  return {
    rows,
    async list() { return rows.map(fromRow); },
    async append(events) { for (const e of events) rows.push({ ...toRow(e), at: new Date(Date.UTC(2026, 9, 22, 0, 0, n++)).toISOString() }); },
  };
}

test('первый вход: записываются стартовые события', async () => {
  const s = memory();
  const { state } = await loadState(s, c, seed);
  assert.deepEqual([state.hero.xp, state.hero.level, state.gold, state.prog], [140, 2, 15, ['1.6']]);
  assert.equal(s.rows.length, seed.length);
  await loadState(s, c, seed);
  assert.equal(s.rows.length, seed.length, 'второй раз не дописываются');
});

test('запросы в обход интерфейса получают 400 и ничего не пишут', async () => {
  const s = memory();
  await loadState(s, c, seed);
  const n = s.rows.length;
  const bad = [
    [{ t: 'quest_submitted', q: '1.6', note: 'готово' }, 'Сначала отметь все задачи'],
    [{ t: 'shop_bought', item: 's1', gold: 0 }, 'Не хватает золота'],
    [{ t: 'chest_opened', chain: 'voice', item: 'w1' }, 'Сундук не готов'],
    [{ t: 'task_set', q: '1.6', task: 'П.1-a', v: true }, 'Нет такой задачи'],
    [{ t: 'quest_taken', q: '1.7' }, 'Квест не доступен'],
    [{ t: 'hack' }, 'Неизвестное действие «hack»'],
  ] as const;
  for (const [body, error] of bad) assert.deepEqual(await applyIntent(s, c, seed, body), { status: 400, body: { error } });
  assert.equal((await applyIntent(s, c, seed, { t: 'quest_taken', q: 'П.1' })).status, 200);
  assert.deepEqual(await applyIntent(s, c, seed, { t: 'quest_taken', q: 'П.2' }), { status: 400, body: { error: 'Оба слота заняты' } });
  assert.equal(s.rows.length, n + 1);
});

test('вся глава через API: 1050 XP, ур. 5, 155 золота; вещь и суммы считает сервер', async () => {
  const s = memory();
  const post = async (body: object) => { const r = await applyIntent(s, c, seed, body, () => 0.5); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body as Exclude<typeof r.body, { error: string }>; };
  let last = (await loadState(s, c, seed));
  for (const id of ['1.6', 'П.1', 'П.2', 'П.3', '1.3', 'Ф.3', '1.7', '1.8', 'Ф.1', 'Ф.2']) {
    const q = c.zone.quests.find(x => x.id === id)!;
    if (last.state.status[id] === 'open') last = await post({ t: 'quest_taken', q: id });
    for (const t of q.tasks) if (!last.state.qs[id].tasks[t.id]) last = await post({ t: 'task_set', q: id, task: t.id, v: true });
    last = await post({ t: 'quest_submitted', q: id, note: 'сделано' });
  }
  assert.deepEqual([last.state.hero.xp, last.state.hero.level, last.state.gold, last.state.bossOpen], [1050, 5, 155, true]);
  last = await post({ t: 'chest_opened', chain: 'voice', item: 'выбираю сам' });
  const item = last.state.chains.voice.rec!.item;
  assert.ok(c.pool.some(p => p.id === item && p.tier === 'big'));
  last = await post({ t: 'chest_swapped', chain: 'voice', gold: 1_000_000 });
  assert.equal(last.state.swapGold, swapValue(c.pool.find(p => p.id === item)!, c.rules));
  assert.deepEqual(s.rows.at(-1)!.payload, { chain: 'voice', gold: last.state.swapGold });
});
