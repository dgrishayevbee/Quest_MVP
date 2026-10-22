'use client';
// Состояние игры для всех экранов. Истина — события с сервера (/api/state, /api/events).
// Для мгновенного отклика действие сразу применяется локально тем же движком (resolveIntent → derive),
// затем уходит на сервер; ответ сервера заменяет локальную копию. Вещь из сундука клиент не выбирает — ждёт сервер.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { derive, resolveIntent, type GameEvent, type Intent, type State } from '@/engine/src/engine';
import { C } from '@/lib/content';

export interface Modal { q: string | null; chest: string | null; boss: boolean; submit: boolean }
interface Game {
  D: State;
  events: GameEvent[];
  notes: string;
  modal: Modal;
  act(i: Intent): { before: State; after: State } | null;
  setNotes(n: string): void;
  toast(m: string): void;
  open(params: Record<string, string>): void;
  close(): void;
}

const Ctx = createContext<Game | null>(null);
export const useGame = (): Game => {
  const g = useContext(Ctx);
  if (!g) throw new Error('useGame вне GameProvider');
  return g;
};

type Res = { ok: true; events: GameEvent[]; notes?: string } | { ok: false; status: number; error: string };
async function call(url: string, init?: RequestInit): Promise<Res> {
  try {
    const r = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json' } });
    const body = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, events: body.events, notes: body.notes } : { ok: false, status: r.status, error: body.error || 'Ошибка сервера' };
  } catch {
    return { ok: false, status: 0, error: 'Нет связи с сервером' };
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const server = useRef<GameEvent[] | null>(null);   // последнее подтверждённое сервером
  const pending = useRef<GameEvent[]>([]);            // применено локально, ждёт ответа
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [events, setEvents] = useState<GameEvent[] | null>(null);
  const [notes, setNotesState] = useState('');
  const [msg, setMsg] = useState({ text: '', show: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter(), path = usePathname(), sp = useSearchParams();

  const publish = () => setEvents([...(server.current ?? []), ...pending.current]);

  const toast = useCallback((text: string) => {
    setMsg({ text, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(m => ({ ...m, show: false })), 3800);
  }, []);

  const failed = useCallback((r: Extract<Res, { ok: false }>) => {
    if (r.status === 401) { router.replace('/login'); return; }
    toast(r.error);
  }, [router, toast]);

  const refresh = useCallback(async () => {
    const r = await call('/api/state');
    if (!r.ok) return failed(r);
    server.current = r.events; pending.current = [];
    if (r.notes !== undefined) setNotesState(r.notes);
    publish();
  }, [failed]);

  useEffect(() => { refresh(); }, [refresh]);

  const D = useMemo(() => (events ? derive(events, C) : null), [events]);

  const act = useCallback((i: Intent) => {
    const cur = [...(server.current ?? []), ...pending.current];
    const before = derive(cur, C);
    let out: { before: State; after: State } | null = null;
    if (i.t !== 'chest_opened') {
      const r = resolveIntent(i, before, C);
      if (r.error !== null) { toast(r.error); return null; }
      pending.current.push({ ...r.event, at: new Date().toISOString() });
      publish();
      out = { before, after: derive([...cur, r.event], C) };
    }
    queue.current = queue.current.then(async () => {
      const r = await call('/api/events', { method: 'POST', body: JSON.stringify(i) });
      if (r.ok) { server.current = r.events; pending.current.shift(); publish(); }
      else { failed(r); await refresh(); }
    });
    return out;
  }, [toast, failed, refresh]);

  const setNotes = useCallback((text: string) => {
    setNotesState(text);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      const r = await call('/api/notes', { method: 'PUT', body: JSON.stringify({ text }) });
      if (!r.ok) failed(r);
    }, 600);
  }, [failed]);

  const modal: Modal = { q: sp.get('q'), chest: sp.get('chest'), boss: sp.has('boss'), submit: sp.has('submit') };
  const open = useCallback((params: Record<string, string>) => router.push(`${path}?${new URLSearchParams(params)}`, { scroll: false }), [router, path]);
  const close = useCallback(() => router.push(path, { scroll: false }), [router, path]);

  const toastEl = <div className={'toast' + (msg.show ? ' show' : '')} role="status">{msg.text}</div>;
  if (!events || !D) return toastEl;
  const game: Game = { D, events, notes, modal, act, setNotes, toast, open, close };
  return (
    <Ctx.Provider value={game}>
      {children}
      {toastEl}
    </Ctx.Provider>
  );
}
