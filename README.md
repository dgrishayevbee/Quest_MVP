# Путь проводника

Квест-приложение для одного игрока: доска заказов, карта зоны, персонаж. Награда считается из того, что делаешь — изучение, тренировка, бой с реальными людьми, работа.

```
npm install            один раз: Next.js и React для сайта
npm run dev            сайт на http://localhost:3000 (доска, карта, персонаж)
npm run build          сборка сайта для Vercel
npm run typecheck      проверка типов TypeScript
npm run check          проверить контент и увидеть прохождение главы по уровням
npm test               тесты движка и сценарии
npm run build:proto    собрать прототип proto/put-provodnika.html
```

Node 22+. Движок, тесты и `check` работают без зависимостей.

Сайт: `app/` — маршруты `/board`, `/map`, `/hero`, окна по `?q=<id>`, `?chest=<id>`, `?boss`; `components/` — плашки из `docs/handoff.md`; `lib/` — контент, подписи и хранилище событий (пока `localStorage`, на этапе 2 — Supabase).

- Задание на MVP для Claude Code — `CLAUDE.md`
- Что и почему — `docs/spec.md`
- Где живут данные и как попадают к Claude — `docs/data-flow.md`
- Как быстро менять логику — `docs/logic-workflow.md`
- Плашки, экраны и привязка к данным для MVP — `docs/handoff.md`
