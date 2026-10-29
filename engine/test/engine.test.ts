import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { questValue, xpForLevel, derive, validate, simulate, canApply, swapValue, upgradeEvents, resolveIntent, parseIntent } from '../src/engine.ts';
import type { GameEvent, Content } from '../src/engine.ts';
import { loadContent, loadJson, ROOT } from '../node/load.ts';

const c = loadContent();
const Q = (id: string) => c.zone.quests.find(q => q.id === id)!;
const play = (ids: string[], base: GameEvent[] = []): GameEvent[] => {
  const ev = [...base];
  for (const id of ids) {
    ev.push({ t: 'quest_taken', q: id });
    Q(id).tasks.forEach(t => ev.push({ t: 'task_set', q: id, task: t.id, v: true }));
    ev.push({ t: 'quest_submitted', q: id, note: 'тест' });
  }
  return ev;
};
// Путь до сундука «Что продаю»: Хормози → мечта клиента → пилот.
const TO_CHEST = ['1.1', '1.2', '1.10', '1.11', 'П.3', '1.3', '1.12'];

test('награда считается из вида и часов задач', () => {
  assert.deepEqual([questValue(Q('П.3'), c.rules).xp, questValue(Q('П.3'), c.rules).gold], [140, 10]);
  assert.deepEqual([questValue(Q('1.15'), c.rules).xp, questValue(Q('1.15'), c.rules).trial], [300, true], 'бой — 300 XP за час');
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
  broken.zone.quests.find(q => q.id === '1.10')!.deps = ['1.11'];
  broken.zone.quests.find(q => q.id === 'П.3')!.tasks = [{ id: 'П.3-a', text: 'читать', kind: 'study', hours: 2 }];
  broken.zone.quests.find(q => q.id === '1.12')!.tasks[1].id = '1.12-a';
  const msgs = validate(broken).filter(i => i.level === 'error').map(i => i.where + ': ' + i.msg).join('\n');
  assert.match(msgs, /зависимость НЕТ не найдена/);
  assert.match(msgs, /цикл зависимостей/);
  assert.match(msgs, /без применения/);
  assert.match(msgs, /id задачи 1.12-a повторяется/);
});

test('недостижимый допуск попадает в ошибки', () => {
  const hard: Content = structuredClone(c);
  hard.zone.quests.find(q => q.id === '1.15')!.min_level = 9;
  assert.ok(validate(hard).some(i => i.level === 'error' && i.where === '1.15'));
});

test('босс главы закрыт печатью уровня 4', () => {
  const lone: Content = structuredClone(c);
  lone.zone.quests.find(q => q.id === '1.15')!.deps = [];
  const s = derive(play(['1.1', '1.2']), lone);
  assert.deepEqual([s.hero.level, s.status['1.15'], s.reasons['1.15']], [2, 'locked', { missing: [], needLevel: 4 }]);
});

test('действия: слоты, сдача без задач, золото', () => {
  const s = derive(play([], [{ t: 'quest_taken', q: 'П.3' }, { t: 'quest_taken', q: '1.9' }]), c);
  assert.equal(canApply({ t: 'quest_taken', q: '1.10' }, s, c), 'Оба слота заняты');
  assert.equal(canApply({ t: 'quest_submitted', q: 'П.3', note: 'x' }, s, c), 'Сначала отметь все задачи');
  assert.equal(canApply({ t: 'shop_bought', item: 's1', gold: 30 }, s, c), 'Не хватает золота');
  assert.equal(canApply({ t: 'task_set', q: 'П.3', task: 'П.3-a', v: true }, s, c), null);
  assert.equal(canApply({ t: 'task_set', q: 'П.3', task: '1.9-a', v: true }, s, c), 'Нет такой задачи');
});

test('задачи по id: порядок в контенте не важен', () => {
  const ev: GameEvent[] = [{ t: 'quest_taken', q: 'П.3' }, { t: 'task_set', q: 'П.3', task: 'П.3-b', v: true }];
  const moved: Content = structuredClone(c);
  moved.zone.quests.find(q => q.id === 'П.3')!.tasks.reverse();
  for (const content of [c, moved]) {
    const s = derive(ev, content);
    assert.deepEqual(s.qs['П.3'].tasks, { 'П.3-a': false, 'П.3-b': true, 'П.3-c': false });
    assert.equal(s.tasksDone, 1);
  }
});

test('старый журнал с номерами задач читается', () => {
  const old = [{ t: 'quest_taken', q: '1.10' }, { t: 'task_set', q: '1.10', i: 1, v: true }];
  const ev = upgradeEvents(old, c);
  assert.deepEqual(ev[1], { t: 'task_set', q: '1.10', task: '1.10-b', v: true });
  assert.equal(derive(ev, c).qs['1.10'].tasks['1.10-b'], true);
});

test('события по квестам и цепочкам, которых больше нет в главе, пропускаются', () => {
  // Журнал 22 октября: 1.6 «Найти фразу против найма» был в работе, в новой главе 1 его нет.
  const ev: GameEvent[] = [
    { t: 'quest_submitted', q: '1.1', note: 'до игры' },
    { t: 'quest_submitted', q: '1.2', note: 'до игры' },
    { t: 'quest_taken', q: '1.6' },
    { t: 'task_set', q: '1.6', task: '1.6-a', v: true },
    { t: 'quest_submitted', q: '1.6', note: 'старый' },
    { t: 'chest_opened', chain: 'voice', item: 'w1' },
    { t: 'chest_received', chain: 'voice' },
    { t: 'chest_received', chain: 'offer' },
  ];
  const s = derive(ev, c);
  assert.deepEqual([s.hero.xp, s.hero.level, s.gold, s.prog, s.seq, s.pool.length], [140, 2, 15, [], ['1.1', '1.2'], c.pool.length]);
  assert.equal(s.chains.offer.chest, 'locked');
  assert.equal(canApply({ t: 'quest_taken', q: '1.6' }, s, c), 'Квест не доступен');
  assert.equal(canApply({ t: 'task_set', q: '1.6', task: '1.6-b', v: true }, s, c), 'Задачи отмечаются только у квеста в работе');
});

test('часы у задачи изменились после взятия — предупреждение', () => {
  const hours = Object.fromEntries(Q('1.12').tasks.map(t => [t.id, t.hours]));
  assert.ok(!validate(c, [{ q: '1.12', hours }]).some(i => /часы у задачи изменились/.test(i.msg)));
  const changed: Content = structuredClone(c);
  changed.zone.quests.find(q => q.id === '1.12')!.tasks[3].hours = 2;
  const w = validate(changed, [{ q: '1.12', hours }]).filter(i => /часы у задачи изменились/.test(i.msg));
  assert.deepEqual(w.map(i => [i.level, i.where]), [['warn', '1.12 · 1.12-d']]);
});

test('сундук: открыть, обменять, вещь возвращается в пул', () => {
  const ev = play(TO_CHEST);
  let s = derive(ev, c);
  assert.equal(s.chains.offer.chest, 'ready');
  ev.push({ t: 'chest_opened', chain: 'offer', item: 'w2' });
  s = derive(ev, c);
  assert.equal(s.pool.length, 2);
  const gold = swapValue(c.pool.find(p => p.id === 'w2')!, c.rules);
  ev.push({ t: 'chest_swapped', chain: 'offer', gold });
  s = derive(ev, c);
  assert.equal(s.pool.length, 3);
  assert.equal(s.chains.offer.chest, 'swapped');
});

test('намерение: вещь из сундука и суммы считает движок, а не клиент', () => {
  const ev = play(TO_CHEST);
  let s = derive(ev, c);
  const big = s.pool.filter(p => p.tier === 'big').map(p => p.id);
  const first = resolveIntent({ t: 'chest_opened', chain: 'offer' }, s, c, () => 0);
  const last = resolveIntent({ t: 'chest_opened', chain: 'offer' }, s, c, () => 0.999);
  assert.deepEqual([first.event, last.event], [{ t: 'chest_opened', chain: 'offer', item: big[0] }, { t: 'chest_opened', chain: 'offer', item: big.at(-1) }]);
  assert.equal(resolveIntent({ t: 'chest_swapped', chain: 'offer' }, s, c).error, 'Сундук не открыт');
  ev.push(first.event!); s = derive(ev, c);
  assert.equal(resolveIntent({ t: 'chest_opened', chain: 'offer' }, s, c).error, 'Сундук не готов');
  const swap = resolveIntent({ t: 'chest_swapped', chain: 'offer', gold: 99999 } as never, s, c);
  assert.deepEqual(swap.event, { t: 'chest_swapped', chain: 'offer', gold: swapValue(c.pool.find(p => p.id === big[0])!, c.rules) });
  const buy = resolveIntent({ t: 'shop_bought', item: c.shop[0].id, gold: 0 } as never, s, c);
  assert.deepEqual(buy.event, { t: 'shop_bought', item: c.shop[0].id, gold: c.shop[0].gold });
  assert.equal(resolveIntent({ t: 'shop_bought', item: 'нет' }, s, c).error, 'Нет такого товара');
  assert.equal(resolveIntent({ t: 'quest_taken', q: '1.15' }, s, c).error, 'Квест не доступен');
  assert.deepEqual(resolveIntent({ t: 'quest_submitted', q: '1.8', note: 'x', at: '2000-01-01' } as never, s, c).error, 'Сначала отметь все задачи');
});

test('разбор намерения: только известные поля', () => {
  assert.deepEqual(parseIntent({ t: 'chest_swapped', chain: 'offer', gold: 99999, at: '2000-01-01' }), { t: 'chest_swapped', chain: 'offer' });
  assert.deepEqual(parseIntent({ t: 'quest_submitted', q: '1.10', note: 'x', links: '', extra: 1 }), { t: 'quest_submitted', q: '1.10', note: 'x', links: '' });
  assert.equal(parseIntent({ t: 'task_set', q: '1.10', task: '1.10-b', v: 'да' }), 'Поле v должно быть true или false');
  assert.equal(parseIntent({ t: 'quest_taken' }), 'Нет поля q');
  assert.equal(parseIntent({ t: 'toString' }), 'Неизвестное действие «toString»');
  assert.equal(parseIntent(null), 'Нужен JSON с полем t');
});

test('стартовые события из content/seed.json: сданы 1.1 и 1.2, слоты свободны', () => {
  const s = derive(loadJson('content/seed.json'), c);
  assert.deepEqual([s.hero.xp, s.hero.level, s.gold, s.prog], [140, 2, 15, []]);
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
  for (const id of ['1.9', '1.13', 'Ф.1']) t.zone.quests.find(q => q.id === id)!.tasks = [{ id: id + '-a', text: 'читать', kind: 'study', hours: 6 }];
  const theory = ['1.1', '1.2', '1.10', 'П.3', '1.9', '1.13', 'Ф.1'];
  const s = derive(play(theory), t);
  assert.ok(s.hero.xp >= 1000, 'опыта хватает на ур. 5');
  assert.equal(s.hero.level, 4);
  assert.equal(s.hero.blocked, true);
  const s2 = derive(play([...theory, '1.4']), t);
  assert.equal(s2.hero.level, 5, 'тренировка в 1.4 снимает блок');
});
