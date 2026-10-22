// POST /api/events — намерение → сервер дописывает вещь и суммы → canApply → 400 с текстом или запись и новое состояние.
import { C, SEED } from '@/lib/content';
import { json, withUser } from '@/lib/server/api';
import { applyIntent } from '@/lib/server/game';

export const POST = (req: Request) => withUser(async ({ store }) => {
  const body = await req.json().catch(() => null);
  const r = await applyIntent(store, C, SEED, body);
  return json(r.body, r.status);
});
