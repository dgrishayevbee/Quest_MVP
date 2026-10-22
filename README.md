# Путь проводника

Квест-приложение для одного игрока: доска заказов, карта зоны, персонаж. Награда считается из того, что делаешь — изучение, тренировка, бой с реальными людьми, работа.

```
npm install            один раз: Next.js и React для сайта
npm run dev            сайт на http://localhost:3000; без ключей Supabase — события в памяти
npm run verify         тесты и проверка контента — то же, что перед каждой выкаткой
npm run build          verify, затем сборка сайта (так собирает Vercel)
npm run typecheck      проверка типов TypeScript
npm run check          проверить контент и увидеть прохождение главы по уровням
npm test               тесты движка и сценарии
npm run build:proto    собрать прототип proto/put-provodnika.html
```

Node 22+. Движок, тесты и `check` работают без зависимостей.

Сайт: `app/` — маршруты `/board`, `/map`, `/hero`, окна по `?q=<id>`, `?chest=<id>`, `?boss`; `components/` — плашки из `docs/handoff.md`; `lib/` — контент и подписи; `lib/server/` — обработчики API поверх движка; `app/api/` — `/api/state`, `/api/events`, `/api/export`, `/api/notes`. База — Supabase: как подключить, в `docs/setup-supabase.md`, схема — `supabase/migrations/`.

- Задание на MVP для Claude Code — `CLAUDE.md`
- Что и почему — `docs/spec.md`
- Где живут данные и как попадают к Claude — `docs/data-flow.md`
- Как быстро менять логику — `docs/logic-workflow.md`
- Плашки, экраны и привязка к данным для MVP — `docs/handoff.md`

## Выкатка

Сайт: https://questmvp.vercel.app. Vercel собирает каждый push в `main` сам, ветки и PR — как превью.

- Сборка начинается с `npm run verify`: тесты движка и `npm run check`. Ошибка в контенте или в движке — сборка падает, на сайте остаётся прошлая рабочая версия.
- GitHub Actions (`.github/workflows/ci.yml`) на каждый push и PR прогоняет типы, тесты, `check` и сборку; отчёт по главе лежит в артефакте `report`.
- `vercel.json`: пресет Next.js и регион функций `sin1` (рядом с базой Supabase в Сингапуре).
- Переменные окружения — в Vercel, список в `.env.example`; настройка базы — `docs/setup-supabase.md`.
