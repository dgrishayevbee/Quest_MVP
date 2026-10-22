// Общее для маршрутов API: пользователь из сессии, хранилище, ответ 401 и 500.
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { eventStore, readNotes, writeNotes } from '@/lib/supabase/store';
import { DEV_MEMORY, memoryNotes, memoryStore } from './devstore';
import type { EventStore } from './game';

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

interface Ctx { store: EventStore; notes: { read(): Promise<string>; write(t: string): Promise<void> } }

export async function withUser(fn: (ctx: Ctx) => Promise<Response>): Promise<Response> {
  let ctx: Ctx;
  if (DEV_MEMORY) ctx = { store: memoryStore, notes: memoryNotes };
  else {
    const u = await currentUser();
    if (!u) return json({ error: 'Нужно войти' }, 401);
    ctx = { store: eventStore(u.supabase, u.user.id), notes: { read: () => readNotes(u.supabase, u.user.id), write: t => writeNotes(u.supabase, u.user.id, t) } };
  }
  try {
    return await fn(ctx);
  } catch (e) {
    console.error(e);
    return json({ error: 'Ошибка базы: ' + (e as Error).message }, 500);
  }
}
