// Сюда ведёт ссылка из письма: обменять код на сессию и открыть доску.
import { NextResponse } from 'next/server';
import { allowed, createClient } from '@/lib/supabase/server';
import { CONFIGURED } from '@/lib/supabase/env';

export async function GET(req: Request) {
  const url = new URL(req.url), code = url.searchParams.get('code');
  if (code && CONFIGURED) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && allowed(data.user)) return NextResponse.redirect(new URL('/board', url.origin));
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL('/login?error=1', url.origin));
}
