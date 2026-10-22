# Подключение Supabase

Один раз, руками в панели Supabase. Код ничего не создаёт в базе сам.

## 1. Таблицы
**SQL Editor → New query**: вставить весь `supabase/migrations/0001_init.sql` → **Run**.
Создаются `events` (только чтение и добавление своих строк, менять и удалять нельзя) и `notes`.

Отличие от схемы в `CLAUDE.md`: у `events` есть колонка `seq`. Стартовые события пишутся одним запросом и получают одинаковый `at`, поэтому порядок держится по `(at, seq)`.

## 2. Пользователь
**Authentication → Users → Add user → Create new user**: почта Дениса, «Auto Confirm User» включить. Пароль любой, он не нужен: вход по ссылке.

Затем **Authentication → Sign In / Providers → Email**: выключить **Allow new users to sign up**. Сайт и так пускает только `ALLOWED_EMAIL`, это второй замок.

## 3. Адреса для ссылки из письма
**Authentication → URL Configuration**:
- Site URL — адрес сайта на Vercel (пока его нет — `http://localhost:3000`);
- Redirect URLs — добавить `http://localhost:3000/auth/callback` и `https://<сайт>.vercel.app/auth/callback`.

## 4. Ключи
**Connect → Framework → Next.js**, вкладка `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (старое имя `NEXT_PUBLIC_SUPABASE_ANON_KEY` тоже подходит). Это публичный ключ, его видит браузер; доступ к данным закрывают политики RLS. Ключ `service_role` / secret сайту не нужен — никуда его не вставляй.

Локально: скопировать `.env.example` в `.env.local` и заполнить. На Vercel — те же три переменные в **Settings → Environment Variables**, до сборки (переменные `NEXT_PUBLIC_*` вшиваются при сборке).

## Без Supabase
`npm run dev` без ключей включает режим разработки: события живут в памяти сервера до перезапуска, вход не нужен. В сборке (`npm run build`) этот режим выключен.
