// Обработчики API без привязки к Supabase: хранилище передаётся снаружи, поэтому их можно тестировать в памяти.
// Порядок для POST /api/events: прочитать события → derive → parseIntent → resolveIntent (вещь, суммы, canApply) → записать.
import { derive, parseIntent, resolveIntent, type Content, type GameEvent, type State } from '../../engine/src/engine.ts';

export interface EventStore {
  list(): Promise<GameEvent[]>;                  // события пользователя по порядку записи, с at
  append(events: GameEvent[]): Promise<void>;     // дописать (at ставит база)
}
export interface Snapshot { events: GameEvent[]; state: State }
export type Reply = { status: 200; body: Snapshot } | { status: 400; body: { error: string } };

// Первый вход: событий нет — записать стартовые (content/seed.json) без их дат.
export async function loadState(store: EventStore, c: Content, seed: GameEvent[]): Promise<Snapshot> {
  let events = await store.list();
  if (!events.length) {
    await store.append(seed.map(({ at: _at, ...e }) => e as GameEvent));
    events = await store.list();
  }
  return { events, state: derive(events, c) };
}

export async function applyIntent(store: EventStore, c: Content, seed: GameEvent[], body: unknown, rnd: () => number = Math.random): Promise<Reply> {
  const intent = parseIntent(body);
  if (typeof intent === 'string') return { status: 400, body: { error: intent } };
  const { state } = await loadState(store, c, seed);
  const r = resolveIntent(intent, state, c, rnd);
  if (r.error !== null) return { status: 400, body: { error: r.error } };
  await store.append([r.event]);
  const events = await store.list();
  return { status: 200, body: { events, state: derive(events, c) } };
}

export function exportLog(c: Content, events: GameEvent[], notes: string) {
  return { version: c.rules.version, exported: new Date().toISOString(), events, notes };
}
