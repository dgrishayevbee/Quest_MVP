// Таблицы events и notes в Supabase. RLS пускает только к своим строкам; update и delete у events запрещены.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventStore } from '@/lib/server/game';
import { fromRow, toRow, type EventRow } from '@/lib/server/rows';

export function eventStore(db: SupabaseClient, userId: string): EventStore {
  return {
    async list() {
      const { data, error } = await db.from('events').select('at, type, payload').eq('user_id', userId).order('at').order('seq');
      if (error) throw new Error('events: ' + error.message);
      return (data as EventRow[]).map(fromRow);
    },
    async append(events) {
      const { error } = await db.from('events').insert(events.map(e => ({ ...toRow(e), user_id: userId })));
      if (error) throw new Error('events: ' + error.message);
    },
  };
}

export async function readNotes(db: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await db.from('notes').select('text').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('notes: ' + error.message);
  return data?.text ?? '';
}

export async function writeNotes(db: SupabaseClient, userId: string, text: string): Promise<void> {
  const { error } = await db.from('notes').upsert({ user_id: userId, text, updated_at: new Date().toISOString() });
  if (error) throw new Error('notes: ' + error.message);
}
