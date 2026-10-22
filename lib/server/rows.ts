// Строка таблицы events ↔ событие движка: type = t, payload = остальные поля без t и at.
import type { GameEvent } from '../../engine/src/engine.ts';

export interface EventRow { at: string; type: string; payload: Record<string, unknown> }

export const fromRow = (r: EventRow): GameEvent => ({ ...r.payload, t: r.type, at: r.at }) as GameEvent;

export function toRow(e: GameEvent): { type: string; payload: Record<string, unknown> } {
  const { t, at: _at, ...payload } = e;
  return { type: t, payload };
}
