// GET /api/state — события пользователя по порядку и derive от них. Первый вход записывает стартовые события.
import { C, SEED } from '@/lib/content';
import { json, withUser } from '@/lib/server/api';
import { loadState } from '@/lib/server/game';

export const dynamic = 'force-dynamic';

export const GET = () => withUser(async ({ store, notes: n }) => {
  const [snap, notes] = await Promise.all([loadState(store, C, SEED), n.read()]);
  return json({ ...snap, notes });
});
