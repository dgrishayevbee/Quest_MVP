// Для `npm run dev` и превью-выкаток Vercel без ключей Supabase: события и заметки живут в памяти процесса,
// входа нет. Память сбрасывается при перезапуске функции. На проде (VERCEL_ENV=production) режим выключен.
import type { GameEvent } from '@/engine/src/engine';
import type { EventStore } from './game';

export const DEV_MEMORY = (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') && !process.env.NEXT_PUBLIC_SUPABASE_URL;

const g = globalThis as unknown as { __quest?: { events: GameEvent[]; notes: string; n: number } };
const mem = () => (g.__quest ??= { events: [], notes: '', n: 0 });

export const memoryStore: EventStore = {
  async list() { return structuredClone(mem().events); },
  async append(events) { const m = mem(); for (const e of events) m.events.push({ ...e, at: new Date(Date.now() + m.n++).toISOString() }); },
};
export const memoryNotes = { read: async () => mem().notes, write: async (t: string) => { mem().notes = t; } };
