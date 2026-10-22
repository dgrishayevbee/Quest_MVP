// Клиент Supabase на сервере (маршруты API, страницы): сессия берётся из cookies запроса.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { ALLOWED_EMAIL, CONFIGURED, SUPABASE_KEY, SUPABASE_URL } from './env';

export async function createClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: list => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* страница не может ставить cookies — обновит proxy */ } },
    },
  });
}

export const allowed = (u: User | null): u is User => !!u && (!ALLOWED_EMAIL || u.email?.toLowerCase() === ALLOWED_EMAIL);

// Пользователь запроса или null, если не вошёл или это не Денис.
export async function currentUser() {
  if (!CONFIGURED) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return allowed(data.user) ? { supabase, user: data.user } : null;
}
