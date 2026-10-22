'use client';
// Состояние игры для всех экранов: события → derive. Действие проходит через resolveIntent (там же canApply),
// поэтому клиент не считает ничего сам. На этапе 2 истиной станет ответ сервера.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { derive, resolveIntent, type GameEvent, type Intent, type State } from '@/engine/src/engine';
import { C } from '@/lib/content';
import { fresh, load, save, type Saved } from '@/lib/store';

export interface Modal { q: string | null; chest: string | null; boss: boolean; submit: boolean }
interface Game {
  D: State;
  events: GameEvent[];
  notes: string;
  modal: Modal;
  act(i: Intent): { before: State; after: State } | null;
  setNotes(n: string): void;
  reset(): void;
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

export function GameProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const ref = useRef<Saved | null>(null);
  const [msg, setMsg] = useState({ text: '', show: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter(), path = usePathname(), sp = useSearchParams();

  useEffect(() => { ref.current = load(); setSaved(ref.current); }, []);
  const commit = (s: Saved) => { ref.current = s; save(s); setSaved(s); };

  const D = useMemo(() => (saved ? derive(saved.events, C) : null), [saved]);

  const toast = useCallback((text: string) => {
    setMsg({ text, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(m => ({ ...m, show: false })), 3800);
  }, []);

  const act = useCallback((i: Intent) => {
    const cur = ref.current!;
    const before = derive(cur.events, C);
    const r = resolveIntent(i, before, C);
    if (r.error !== null) { toast(r.error); return null; }
    const events = [...cur.events, { ...r.event, at: new Date().toISOString() }];
    commit({ ...cur, events });
    return { before, after: derive(events, C) };
  }, [toast]);

  const modal: Modal = { q: sp.get('q'), chest: sp.get('chest'), boss: sp.has('boss'), submit: sp.has('submit') };
  const open = useCallback((params: Record<string, string>) => router.push(`${path}?${new URLSearchParams(params)}`, { scroll: false }), [router, path]);
  const close = useCallback(() => router.push(path, { scroll: false }), [router, path]);

  if (!saved || !D) return null;
  const game: Game = {
    D, events: saved.events, notes: saved.notes, modal, act, toast, open, close,
    setNotes: n => commit({ ...ref.current!, notes: n }),
    reset: () => commit(fresh(ref.current!.notes)),
  };
  return (
    <Ctx.Provider value={game}>
      {children}
      <div className={'toast' + (msg.show ? ' show' : '')} role="status">{msg.text}</div>
    </Ctx.Provider>
  );
}
