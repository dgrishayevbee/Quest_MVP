import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { questValue, xpForLevel, derive, validate, simulate, canApply, swapValue } from '../src/engine.ts';
import type { GameEvent, Content } from '../src/engine.ts';
import { loadContent, ROOT } from '../node/load.ts';

const c = loadContent();
const Q = (id: string) => c.zone.quests.find(q => q.id === id)!;
const play = (ids: string[], base: GameEvent[] = []): GameEvent[] => {
  const ev = [...base];
  for (const id of ids) {
    ev.push({ t: 'quest_taken', q: id });
    Q(id).tasks.forEach((_, i) => ev.push({ t: 'task_set', q: id, i, v: true }));
    ev.push({ t: 'quest_submitted', q: id, note: 'тест' });
  }
  return ev;
};

test('награда считается из вида и часов задач', () => {
  assert.deepEqual([questValue(Q('П.1'), c.rules).xp, questValue(Q('П.1'), c.rules).gold], [180, 10]);
  assert.equal(questValue(Q('1.8'), c.rules).xp, 0);
  assert.equal(questValue(Q('Ф.1'), c.rules).hours, 1.25, 'необязательная задача не входит в расчёт');
});

test('кривая уровней', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 10].map(xpForLevel), [0, 100, 300, 600, 1000, 4500]);
});

test('контент главы 1 без ошибок', () => {
  const errs = validate(c).filter(i => i.level === 'error');
  assert.deepEqual(errs, []);
});

test('проверка ловит битый контент', () => {
  const broken: Content = structuredClone(c);
  broken.zone.quests[0].deps = ['НЕТ'];
  broken.zone.quests.find(q => q.id === 'П.1')!.deps = ['1.7'];
  broken.zone.quests.find(q => q.id === 'П.2')!.tasks = [{ text: 'читать', kind: 'study', hours: 2 }];
  const msgs = validate(broken).filter(i => i.level === 'error').map(i => i.where + ': ' + i.msg).join('\n');
  assert.match(msgs, /зависимость НЕТ не найдена/);
  assert.match(msgs, /цикл зависимостей/);
  assert.match(msgs, /без применения/);
});

test('недостижимый допуск попадает в ошибки', () => {
  const hard: Content = structuredClone(c);
  hard.zone.quests.find(q => q.id === '1.7')!.min_level = 9;
  assert.ok(validate(hard).some(i => i.level === 'error' && i.where === '1.7'));
});

test('действия: слоты, сдача без задач, золото', () => {
  const s = derive(play([], [{ t: 'quest_taken', q: 'П.1' }, { t: 'quest_taken', q: 'П.2' }]), c);
  assert.equal(canApply({ t: 'quest_taken', q: 'П.3' }, s, c), 'Оба слота заняты');
  assert.equal(canApply({ t: 'quest_submitted', q: 'П.1', note: 'x' }, s, c), 'Сначала отметь все задачи');
  assert.equal(canApply({ t: 'shop_bought', item: 's1', gold: 30 }, s, c), 'Не хватает золота');
});

test('сундук: открыть, обменять, вещь возвращается в пул', () => {
  const ev = play(['1.1', '1.2', 'П.1', 'П.2', 'П.3', '1.3', '1.6', 'Ф.3', '1.7']);
  let s = derive(ev, c);
  assert.equal(s.chains.voice.chest, 'ready');
  ev.push({ t: 'chest_opened', chain: 'voice', item: 'w2' });
  s = derive(ev, c);
  assert.equal(s.pool.length, 2);
  const gold = swapValue(c.pool.find(p => p.id === 'w2')!, c.rules);
  ev.push({ t: 'chest_swapped', chain: 'voice', gold });
  s = derive(ev, c);
  assert.equal(s.pool.length, 3);
  assert.equal(s.chains.voice.chest, 'swapped');
});

const get = (s: ReturnType<typeof derive>, key: string): unknown => {
  if (key === 'xp') return s.hero.xp;
  if (key === 'level') return s.hero.level;
  if (key === 'blocked') return s.hero.blocked;
  if (key === 'gold') return s.gold;
  if (key === 'bossOpen') return s.bossOpen;
  if (key === 'slots') return s.prog.length;
  if (key.startsWith('status.')) return s.status[key.slice(7)];
  if (key.startsWith('chest.')) return s.chains[key.slice(6)]?.chest;
  throw new Error('неизвестный ключ ' + key);
};
const dir = join(ROOT, 'engine/test/scenarios');
for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const sc = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  test(`сценарий ${f}: ${sc.name}`, () => {
    const ev = play(sc.play || [], []).concat(sc.events || []);
    const s = derive(ev, c);
    for (const [k, v] of Object.entries(sc.expect)) assert.equal(get(s, k), v, `${k}`);
  });
}

test('симуляция совпадает с прохождением', () => {
  const sim = simulate(c);
  assert.equal(sim.stuck.length, 0);
  assert.equal(sim.final.hero.level, 5);
});

test('испытание: с ур. 4 одна теория не поднимает уровень', () => {
  const t: Content = structuredClone(c);
  for (const id of ['1.3', 'Ф.1']) t.zone.quests.find(q => q.id === id)!.tasks = [{ text: 'читать', kind: 'study', hours: 6 }];
  const s = derive(play(['1.1', '1.2', 'П.1', 'П.2', 'П.3', '1.3', 'Ф.1'], []).map(e => e), t);
  assert.ok(s.hero.xp >= 1000, 'опыта хватает на ур. 5');
  assert.equal(s.hero.level, 4);
  assert.equal(s.hero.blocked, true);
  const s2 = derive(play(['1.1', '1.2', 'П.1', 'П.2', 'П.3', '1.3', 'Ф.1', '1.6']), t);
  assert.equal(s2.hero.level, 5, 'тренировка в 1.6 снимает блок');
});
