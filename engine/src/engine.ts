// Движок «Пути проводника». Один файл, без зависимостей и без импорта.
// Здесь вся логика: расчёт награды квеста, уровень и испытание, пересчёт состояния из событий,
// проверка контента и симуляция прохождения. Тот же код работает в прототипе, на бэкенде и в отчётах.
// Правило: числа меняются в content/rules.json, формулы — только здесь и только вместе с тестами.

// ---------- типы контента

export type KindId = 'study' | 'practice' | 'battle' | 'work';
export interface Kind { label: string; xp_per_hour: number; gold_per_hour: number; proof: 'none' | 'note' | 'link'; hint: string }
export interface Tier { title: string; range: string; min_pool: number }
export interface Rules {
  version: string;
  kinds: Record<KindId, Kind>;
  rounding: { xp: number; gold: number };
  level: { trial_from_level: number; trial_kinds: KindId[] };
  chain_bonus_gold: number;
  slots: number;
  rate_kzt_per_gold: { value: number; placeholder?: boolean };
  swap_share?: number;
  tiers: Record<string, Tier>;
}
export interface Task { id: string; text: string; kind: KindId; hours: number; optional?: boolean; done?: boolean }
export interface Point { x: number; y: number }
export interface Quest {
  id: string; title: string; brief: string; type: 'main' | 'side' | 'prep';
  status?: 'done' | 'prog' | 'open' | 'locked';
  deps: string[]; min_level?: number; chain?: string; deadline?: string;
  story?: string; win: string; tasks: Task[]; map?: Point;
}
export interface Chain { id: string; title: string; quests: string[]; chest?: string }
export interface Zone {
  id: string; title: string; goal: string; min_level: number;
  boss: { title: string; keys: string[] };
  chains: Chain[]; quests: Quest[];
  map?: { size: { w: number; h: number }; chest: Record<string, Point>; boss: Point; regions?: (Point & { name: string })[] };
}
export interface PoolItem { id: string; tier: string; title: string; price: number; added?: string; confirmed?: string; placeholder?: boolean }
export interface ShopItem { id: string; title: string; gold: number; placeholder?: boolean }
export interface Content { rules: Rules; zone: Zone; pool: PoolItem[]; shop: ShopItem[] }

// ---------- события (единственное, что хранит база)

export type GameEvent =
  | { t: 'quest_taken'; q: string; at?: string }
  | { t: 'quest_dropped'; q: string; at?: string }
  | { t: 'task_set'; q: string; task: string; v: boolean; at?: string }
  | { t: 'quest_submitted'; q: string; note: string; links?: string; proof?: string; at?: string }
  | { t: 'quest_reopened'; q: string; at?: string }
  | { t: 'chest_opened'; chain: string; item: string; at?: string }
  | { t: 'chest_received'; chain: string; photo?: string; at?: string }
  | { t: 'chest_swapped'; chain: string; gold: number; at?: string }
  | { t: 'shop_bought'; item: string; gold: number; at?: string };

// ---------- расчёт награды квеста

export interface QuestValue { xp: number; gold: number; hours: number; trial: boolean; parts: { kind: KindId; hours: number; xp: number; gold: number }[] }

export const roundTo = (v: number, step: number): number => Math.floor(v / step + 0.5) * step;
export const xpForLevel = (L: number): number => 50 * L * (L - 1);

export function questValue(q: Quest, rules: Rules): QuestValue {
  let xp = 0, gold = 0, hours = 0, trial = false;
  const parts: QuestValue['parts'] = [];
  for (const t of q.tasks) {
    if (t.optional) continue;
    const k = rules.kinds[t.kind];
    const px = k.xp_per_hour * t.hours, pg = k.gold_per_hour * t.hours;
    xp += px; gold += pg; hours += t.hours;
    parts.push({ kind: t.kind, hours: t.hours, xp: px, gold: pg });
    if (rules.level.trial_kinds.includes(t.kind)) trial = true;
  }
  return { xp: roundTo(xp, rules.rounding.xp), gold: roundTo(gold, rules.rounding.gold), hours: Math.round(hours * 100) / 100, trial, parts };
}

// ---------- уровень и испытание

export interface Hero { xp: number; level: number; blocked: boolean; needTrial: boolean }

export function replayHero(seq: string[], values: Record<string, QuestValue>, rules: Rules): Hero {
  let xp = 0, level = 1, trialDone = false, blocked = false;
  const from = rules.level.trial_from_level;
  for (const id of seq) {
    const v = values[id];
    xp += v.xp; if (v.trial) trialDone = true;
    blocked = false;
    while (xp >= xpForLevel(level + 1)) {
      if (level >= from && !trialDone) { blocked = true; break; }
      level += 1;
      if (level >= from) trialDone = false;
    }
  }
  return { xp, level, blocked, needTrial: level >= from && !trialDone };
}

// ---------- состояние из событий

export type QuestStatus = 'done' | 'prog' | 'ready' | 'open' | 'locked';
export interface QuestState { taken: boolean; done: boolean; tasks: Record<string, boolean>; note: string; links: string; at: string | null }
export const doneCount = (s: QuestState): number => Object.values(s.tasks).filter(Boolean).length;
export interface ChestRecord { item: string; at?: string; state: 'opened' | 'received' | 'swapped'; photo?: string; gold?: number }
export interface ChainState { done: number; total: number; complete: boolean; chest: 'locked' | 'ready' | 'empty_pool' | 'opened' | 'received' | 'swapped'; rec: ChestRecord | null }
export interface State {
  qs: Record<string, QuestState>;
  status: Record<string, QuestStatus>;
  reasons: Record<string, { missing: string[]; needLevel: number | null }>;
  values: Record<string, QuestValue>;
  hero: Hero; seq: string[]; prog: string[];
  chains: Record<string, ChainState>;
  pool: PoolItem[]; shop: { item: string; gold: number; at?: string }[];
  archive: { q: string; note: string; links?: string; at?: string }[];
  gold: number; earned: number; spent: number; swapGold: number;
  tasksDone: number; battles: number; received: number;
  bossKeys: { id: string; ok: boolean }[]; bossOpen: boolean;
}

export function derive(events: GameEvent[], c: Content): State {
  const { rules, zone } = c;
  const values: Record<string, QuestValue> = {};
  const qs: Record<string, QuestState> = {};
  for (const q of zone.quests) {
    values[q.id] = questValue(q, rules);
    qs[q.id] = { taken: false, done: false, tasks: Object.fromEntries(q.tasks.map(t => [t.id, false])), note: '', links: '', at: null };
  }
  let seq: string[] = [];
  const chests: Record<string, ChestRecord> = {};
  const shop: State['shop'] = [];
  const archive: State['archive'] = [];
  let swapGold = 0;
  for (const e of events) {
    if (e.t === 'quest_taken') qs[e.q].taken = true;
    else if (e.t === 'quest_dropped') qs[e.q].taken = false;
    else if (e.t === 'task_set') { if (e.task in qs[e.q].tasks) qs[e.q].tasks[e.task] = !!e.v; }
    else if (e.t === 'quest_submitted') {
      const s = qs[e.q];
      s.done = true; s.taken = false; s.note = e.note || ''; s.links = e.links || ''; s.at = e.at || null;
      seq = seq.filter(x => x !== e.q); seq.push(e.q);
      archive.push({ q: e.q, note: e.note, links: e.links, at: e.at });
    }
    else if (e.t === 'quest_reopened') { qs[e.q].done = false; qs[e.q].taken = true; seq = seq.filter(x => x !== e.q); }
    else if (e.t === 'chest_opened') chests[e.chain] = { item: e.item, at: e.at, state: 'opened' };
    else if (e.t === 'chest_received') { chests[e.chain].state = 'received'; chests[e.chain].photo = e.photo || ''; }
    else if (e.t === 'chest_swapped') { chests[e.chain].state = 'swapped'; chests[e.chain].gold = e.gold; swapGold += e.gold; }
    else if (e.t === 'shop_bought') shop.push({ item: e.item, gold: e.gold, at: e.at });
  }
  const hero = replayHero(seq, values, rules);
  const status: State['status'] = {}, reasons: State['reasons'] = {};
  for (const q of zone.quests) {
    const s = qs[q.id];
    if (s.done) { status[q.id] = 'done'; continue; }
    if (s.taken) { status[q.id] = q.tasks.every(t => t.optional || s.tasks[t.id]) ? 'ready' : 'prog'; continue; }
    const missing = q.deps.filter(d => !qs[d].done);
    const lvlOk = hero.level >= (q.min_level || 1);
    reasons[q.id] = { missing, needLevel: lvlOk ? null : (q.min_level || 1) };
    status[q.id] = !missing.length && lvlOk ? 'open' : 'locked';
  }
  const used = Object.values(chests).filter(r => r.state !== 'swapped').map(r => r.item);
  const pool = c.pool.filter(p => !used.includes(p.id));
  const chains: State['chains'] = {};
  let chainGold = 0;
  for (const ch of zone.chains) {
    const done = ch.quests.filter(id => qs[id].done).length;
    const complete = done === ch.quests.length;
    if (complete) chainGold += rules.chain_bonus_gold;
    let cs: ChainState['chest'] = 'locked';
    if (chests[ch.id]) cs = chests[ch.id].state;
    else if (complete && ch.chest) cs = pool.filter(p => p.tier === ch.chest).length >= (rules.tiers[ch.chest]?.min_pool ?? 3) ? 'ready' : 'empty_pool';
    chains[ch.id] = { done, total: ch.quests.length, complete, chest: cs, rec: chests[ch.id] || null };
  }
  const byId: Record<string, Quest> = Object.fromEntries(zone.quests.map(q => [q.id, q]));
  const earned = seq.reduce((a, id) => a + values[id].gold, 0) + chainGold;
  const spent = shop.reduce((a, s) => a + s.gold, 0);
  const bossKeys = zone.boss.keys.map(k => ({ id: k, ok: qs[k].done }));
  return {
    qs, status, reasons, values, hero, seq,
    prog: zone.quests.filter(q => status[q.id] === 'prog' || status[q.id] === 'ready').map(q => q.id),
    chains, pool, shop, archive,
    gold: earned + swapGold - spent, earned, spent, swapGold,
    tasksDone: zone.quests.reduce((a, q) => a + doneCount(qs[q.id]), 0),
    battles: seq.reduce((a, id) => a + byId[id].tasks.filter(t => t.kind === 'battle' && !t.optional).length, 0),
    received: Object.values(chests).filter(r => r.state === 'received').length + shop.length,
    bossKeys, bossOpen: bossKeys.every(k => k.ok),
  };
}

// Старые журналы (прототип до постоянных id) хранят в task_set номер задачи `i`. Переводим номер в id задачи.
export function upgradeEvents(events: unknown[], c: Content): GameEvent[] {
  return events.map(raw => {
    const e = raw as GameEvent & { i?: number };
    if (e.t !== 'task_set' || e.task !== undefined || typeof e.i !== 'number') return e;
    const { i, ...rest } = e;
    const task = c.zone.quests.find(q => q.id === e.q)?.tasks[i]?.id ?? `${e.q}#${i}`;
    return { ...rest, task };
  });
}

// ---------- разрешённые действия (бэкенд проверяет их перед записью события)

export function canApply(e: GameEvent, s: State, c: Content): string | null {
  const st = 'q' in e ? s.status[e.q] : undefined;
  switch (e.t) {
    case 'quest_taken': return st !== 'open' ? 'Квест не доступен' : s.prog.length >= c.rules.slots ? 'Оба слота заняты' : null;
    case 'quest_dropped': return st === 'prog' || st === 'ready' ? null : 'Квест не в работе';
    case 'task_set': return st !== 'prog' && st !== 'ready' ? 'Задачи отмечаются только у квеста в работе' : !(e.task in s.qs[e.q].tasks) ? 'Нет такой задачи' : null;
    case 'quest_submitted': return st !== 'ready' ? 'Сначала отметь все задачи' : !e.note?.trim() ? 'Нужна заметка о том, что сделано' : null;
    case 'quest_reopened': return st !== 'done' ? 'Квест не сдан' : s.prog.length >= c.rules.slots ? 'Оба слота заняты' : null;
    case 'chest_opened': return s.chains[e.chain]?.chest === 'ready' ? null : 'Сундук не готов';
    case 'chest_received': case 'chest_swapped': return s.chains[e.chain]?.chest === 'opened' ? null : 'Сундук не открыт';
    case 'shop_bought': return s.gold >= e.gold ? null : 'Не хватает золота';
  }
  return null;
}
export const swapValue = (item: PoolItem, rules: Rules): number => Math.round(item.price * (rules.swap_share ?? 1) / rules.rate_kzt_per_gold.value);

// Намерение с сайта. Клиент не присылает выпавшую вещь и суммы: их дописывает resolveIntent (на бэкенде — сервер).
export type Intent =
  | Exclude<GameEvent, { t: 'chest_opened' | 'chest_swapped' | 'shop_bought' }>
  | { t: 'chest_opened'; chain: string }
  | { t: 'chest_swapped'; chain: string }
  | { t: 'shop_bought'; item: string };

// Разбор тела запроса: только известные поля нужного типа. Суммы, вещь и дату клиент прислать не может.
const INTENT_FIELDS: Record<Intent['t'], [string, 'string' | 'boolean', boolean][]> = {
  quest_taken: [['q', 'string', true]], quest_dropped: [['q', 'string', true]], quest_reopened: [['q', 'string', true]],
  task_set: [['q', 'string', true], ['task', 'string', true], ['v', 'boolean', true]],
  quest_submitted: [['q', 'string', true], ['note', 'string', true], ['links', 'string', false], ['proof', 'string', false]],
  chest_opened: [['chain', 'string', true]], chest_swapped: [['chain', 'string', true]],
  chest_received: [['chain', 'string', true], ['photo', 'string', false]],
  shop_bought: [['item', 'string', true]],
};
export function parseIntent(body: unknown): Intent | string {
  if (!body || typeof body !== 'object') return 'Нужен JSON с полем t';
  const b = body as Record<string, unknown>, t = b.t as Intent['t'];
  const fields = Object.hasOwn(INTENT_FIELDS, String(t)) ? INTENT_FIELDS[t] : null;
  if (!fields) return `Неизвестное действие «${String(b.t)}»`;
  const out: Record<string, unknown> = { t };
  for (const [k, type, required] of fields) {
    if (b[k] === undefined) { if (required) return `Нет поля ${k}`; continue; }
    if (typeof b[k] !== type) return `Поле ${k} должно быть ${type === 'string' ? 'строкой' : 'true или false'}`;
    out[k] = b[k];
  }
  return out as Intent;
}

// Превращает намерение в событие и проверяет его через canApply. Вещь из сундука — случайно и равновероятно среди пула тира.
export function resolveIntent(i: Intent, s: State, c: Content, rnd: () => number = Math.random): { event: GameEvent; error: null } | { event: null; error: string } {
  const fail = (error: string) => ({ event: null, error });
  let e: GameEvent;
  if (i.t === 'chest_opened') {
    const ch = c.zone.chains.find(x => x.id === i.chain);
    const opts = ch ? s.pool.filter(p => p.tier === ch.chest) : [];
    if (s.chains[i.chain]?.chest !== 'ready' || !opts.length) return fail('Сундук не готов');
    e = { t: 'chest_opened', chain: i.chain, item: opts[Math.min(opts.length - 1, Math.floor(rnd() * opts.length))].id };
  } else if (i.t === 'chest_swapped') {
    const rec = s.chains[i.chain]?.rec, item = rec ? c.pool.find(p => p.id === rec.item) : undefined;
    if (!item || s.chains[i.chain].chest !== 'opened') return fail('Сундук не открыт');
    e = { t: 'chest_swapped', chain: i.chain, gold: swapValue(item, c.rules) };
  } else if (i.t === 'shop_bought') {
    const it = c.shop.find(x => x.id === i.item);
    if (!it) return fail('Нет такого товара');
    e = { t: 'shop_bought', item: it.id, gold: it.gold };
  } else {
    const { at: _at, ...rest } = i;
    e = rest as GameEvent;
  }
  const err = canApply(e, s, c);
  return err ? fail(err) : { event: e, error: null };
}

// ---------- симуляция прохождения (для отчёта и проверки допусков)

export interface SimStep { id: string; xp: number; level: number; gold: number; blocked: boolean }
export function simulate(c: Content, order?: string[]): { steps: SimStep[]; stuck: { id: string; missing: string[]; needLevel: number | null }[]; final: State } {
  const events: GameEvent[] = [];
  const add = (id: string) => {
    const q = c.zone.quests.find(x => x.id === id)!;
    events.push({ t: 'quest_taken', q: id });
    q.tasks.forEach(t => events.push({ t: 'task_set', q: id, task: t.id, v: true }));
    events.push({ t: 'quest_submitted', q: id, note: 'симуляция' });
  };
  const steps: SimStep[] = [];
  let s = derive(events, c);
  const pending = new Set(c.zone.quests.map(q => q.id));
  const queue = order ? [...order] : null;
  while (pending.size) {
    let next: string | undefined;
    if (queue) { next = queue.shift(); if (next && s.status[next] !== 'open') return { steps, stuck: [{ id: next, ...s.reasons[next] }], final: s }; }
    else next = c.zone.quests.find(q => pending.has(q.id) && s.status[q.id] === 'open')?.id;
    if (!next) break;
    add(next); pending.delete(next); s = derive(events, c);
    steps.push({ id: next, xp: s.hero.xp, level: s.hero.level, gold: s.gold, blocked: s.hero.blocked });
  }
  const stuck = [...pending].map(id => ({ id, ...(s.reasons[id] || { missing: [], needLevel: null }) }));
  return { steps, stuck, final: s };
}

// ---------- подсказки для доски: путь главы и следующий ход

// Порядок прохождения главы — тот же, что в отчёте `npm run check`. Считается из контента, не из событий.
export const chapterPath = (c: Content): string[] => simulate(c).steps.map(s => s.id);

export type NextStep =
  | { kind: 'chest'; chain: string }
  | { kind: 'submit'; q: string }
  | { kind: 'task'; q: string; task: string }
  | { kind: 'take'; q: string }
  | { kind: 'trial' }
  | { kind: 'boss' }
  | { kind: 'none' };

// Самый полезный ход сейчас: сундук → сдать готовый квест → следующая задача → взять квест по пути главы → испытание → страж.
export function nextStep(s: State, c: Content, path: string[] = chapterPath(c)): NextStep {
  const chest = c.zone.chains.find(ch => s.chains[ch.id].chest === 'ready');
  if (chest) return { kind: 'chest', chain: chest.id };
  const ready = s.prog.find(id => s.status[id] === 'ready');
  if (ready) return { kind: 'submit', q: ready };
  for (const id of s.prog) {
    const t = c.zone.quests.find(q => q.id === id)!.tasks.find(t => !t.optional && !s.qs[id].tasks[t.id]);
    if (t) return { kind: 'task', q: id, task: t.id };
  }
  const take = recommended(s, c, path);
  if (take && s.prog.length < c.rules.slots) return { kind: 'take', q: take };
  if (s.hero.blocked) return { kind: 'trial' };
  if (s.bossOpen) return { kind: 'boss' };
  return { kind: 'none' };
}

// Заказ, который советуем взять: первый доступный по пути главы.
export const recommended = (s: State, c: Content, path: string[] = chapterPath(c)): string | null =>
  path.find(id => s.status[id] === 'open') ?? c.zone.quests.find(q => s.status[q.id] === 'open')?.id ?? null;

// ---------- проверка контента

export interface Issue { level: 'error' | 'warn'; where: string; msg: string }
// Часы задач квеста на момент взятия. Заготовка: на этапе 2 снимки придут из базы, пока их никто не передаёт.
export interface TakenSnapshot { q: string; hours: Record<string, number> }
export function validate(c: Content, taken: TakenSnapshot[] = []): Issue[] {
  const out: Issue[] = [];
  const err = (where: string, msg: string) => out.push({ level: 'error', where, msg });
  const warn = (where: string, msg: string) => out.push({ level: 'warn', where, msg });
  const { rules, zone } = c;
  const ids = new Set<string>();
  for (const q of zone.quests) {
    if (ids.has(q.id)) err(q.id, 'ID повторяется');
    ids.add(q.id);
  }
  const taskIds = new Set<string>();
  for (const q of zone.quests) {
    if (!q.title?.trim()) err(q.id, 'нет названия');
    if (!q.brief?.trim()) err(q.id, 'нет короткого «что сделать» (brief)');
    if (!q.win?.trim()) err(q.id, 'нет условия победы');
    if (!q.tasks.length) err(q.id, 'нет задач');
    for (const d of q.deps) if (!ids.has(d)) err(q.id, `зависимость ${d} не найдена`);
    q.tasks.forEach((t, i) => {
      if (!t.id?.trim()) err(`${q.id} · задача ${i + 1}`, 'нет id задачи');
      else if (taskIds.has(t.id)) err(`${q.id} · задача ${i + 1}`, `id задачи ${t.id} повторяется`);
      else taskIds.add(t.id);
      if (!rules.kinds[t.kind]) err(`${q.id} · задача ${i + 1}`, `неизвестный вид «${t.kind}»`);
      if (!(t.hours > 0)) err(`${q.id} · задача ${i + 1}`, 'часы должны быть больше нуля');
      if (t.hours > 6) warn(`${q.id} · задача ${i + 1}`, `${t.hours} ч на одну задачу — лучше разбить`);
    });
    const v = questValue(q, rules);
    if (v.xp === 0 && q.type === 'main') warn(q.id, 'основной квест без опыта: только оформление');
    if (q.type === 'prep' && !q.tasks.some(t => t.kind !== 'study')) err(q.id, 'квест подготовки без применения: нужна задача тренировки или работы');
    if (zone.map && !q.map) warn(q.id, 'нет координат на карте');
    if (q.deadline && q.deadline === nextZone(zone.id) && !zone.boss.keys.includes(q.id)) warn(q.id, `срок «до ${q.deadline}», но квест не ключ босса`);
  }
  // циклы
  const byId: Record<string, Quest> = Object.fromEntries(zone.quests.map(q => [q.id, q]));
  const color: Record<string, number> = {};
  const visit = (id: string, path: string[]): void => {
    if (color[id] === 2 || !byId[id]) return;
    if (color[id] === 1) { err(id, 'цикл зависимостей: ' + [...path, id].join(' → ')); return; }
    color[id] = 1; for (const d of byId[id].deps) visit(d, [...path, id]); color[id] = 2;
  };
  zone.quests.forEach(q => visit(q.id, []));
  for (const ch of zone.chains) {
    for (const id of ch.quests) if (!ids.has(id)) err(`цепочка ${ch.id}`, `квест ${id} не найден`);
    if (ch.chest && !rules.tiers[ch.chest]) err(`цепочка ${ch.id}`, `тир сундука «${ch.chest}» не описан в rules.tiers`);
    if (ch.chest) {
      const n = c.pool.filter(p => p.tier === ch.chest).length;
      if (n < (rules.tiers[ch.chest]?.min_pool ?? 3)) warn(`цепочка ${ch.id}`, `в пуле тира ${ch.chest} ${n} вещей — сундук не откроется`);
      if (c.pool.some(p => p.tier === ch.chest && p.placeholder)) warn(`цепочка ${ch.id}`, 'пул сундука из заглушек');
    }
  }
  for (const k of zone.boss.keys) if (!ids.has(k)) err('босс', `ключ ${k} не найден`);
  // часы фиксируются до взятия: сравниваем со снимком на момент взятия
  for (const snap of taken) {
    const q = byId[snap.q]; if (!q) continue;
    for (const t of q.tasks) if (t.id in snap.hours && snap.hours[t.id] !== t.hours) warn(`${q.id} · ${t.id}`, `часы у задачи изменились после взятия: ${snap.hours[t.id]} → ${t.hours}`);
  }
  // достижимость: всё ли проходится с допусками и испытаниями
  if (!out.some(i => i.level === 'error')) {
    const sim = simulate(c);
    for (const s of sim.stuck) err(s.id, `недостижим: ${s.missing.length ? 'ждёт ' + s.missing.join(', ') : ''}${s.needLevel ? ' ур. ' + s.needLevel : ''}`.trim());
    if (sim.final.hero.blocked) warn('уровень', `в конце главы испытание не пройдено: ${sim.final.hero.xp} XP застряли на ур. ${sim.final.hero.level}`);
  }
  if (rules.rate_kzt_per_gold.placeholder) warn('правила', 'курс золота — заглушка');
  return out;
}
function nextZone(id: string): string { const n = Number(id.split('-')[1]); return `zone-${n + 1}`; }
