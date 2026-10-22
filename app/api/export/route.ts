// GET /api/export — журнал событий JSON: { version, exported, events, notes }, как кнопка в прототипе.
import { C } from '@/lib/content';
import { json, withUser } from '@/lib/server/api';
import { exportLog } from '@/lib/server/game';

export const dynamic = 'force-dynamic';

export const GET = () => withUser(async ({ store, notes }) => json(exportLog(C, await store.list(), await notes.read())));
