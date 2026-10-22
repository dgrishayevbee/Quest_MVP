-- Путь проводника: база. Выполнить один раз в Supabase → SQL Editor.
-- В базе хранятся только действия (events) и заметки. Уровень, XP, золото и статусы считает derive.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,   -- порядок записи: у событий одной транзакции одинаковый at
  user_id uuid not null default auth.uid() references auth.users(id),
  at timestamptz not null default now(),
  type text not null check (type in ('quest_taken', 'quest_dropped', 'task_set', 'quest_submitted', 'quest_reopened',
                                     'chest_opened', 'chest_received', 'chest_swapped', 'shop_bought')),
  payload jsonb not null                     -- поля события GameEvent без t и at
);
create index if not exists events_user_order on public.events (user_id, at, seq);

-- Журнал только дописывается: читать и добавлять свои события, менять и удалять нельзя никому из клиентов.
alter table public.events enable row level security;
drop policy if exists "own events" on public.events;
drop policy if exists "read own events" on public.events;
drop policy if exists "add own events" on public.events;
create policy "read own events" on public.events for select to authenticated using (user_id = auth.uid());
create policy "add own events" on public.events for insert to authenticated with check (user_id = auth.uid());
revoke update, delete, truncate on public.events from anon, authenticated;

create table if not exists public.notes (     -- заметки по прототипу, не игровая логика
  user_id uuid primary key default auth.uid() references auth.users(id),
  text text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke delete, truncate on public.notes from anon, authenticated;
