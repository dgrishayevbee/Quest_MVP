// Этап 1: журнал событий хранится в браузере. На этапе 2 этот модуль заменят вызовы /api/state и /api/events.
import { upgradeEvents, type GameEvent } from '@/engine/src/engine';
import { C, SEED } from './content';

const KEY = 'put-provodnika-mvp';
export interface Saved { events: GameEvent[]; notes: string }

export const fresh = (notes = ''): Saved => ({ events: structuredClone(SEED), notes });

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.events)) return { events: upgradeEvents(p.events, C), notes: p.notes || '' };
    }
  } catch {}
  return fresh();
}

export function save(s: Saved): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
