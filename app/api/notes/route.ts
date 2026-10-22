// PUT /api/notes — сохранить заметки по прототипу: { text }.
import { json, withUser } from '@/lib/server/api';

export const PUT = (req: Request) => withUser(async ({ notes }) => {
  const body = await req.json().catch(() => null);
  if (typeof body?.text !== 'string' || body.text.length > 20000) return json({ error: 'Нужно поле text, до 20 000 знаков' }, 400);
  await notes.write(body.text);
  return json({ ok: true });
});
