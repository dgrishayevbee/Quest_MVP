// Перед каждым запросом: обновить сессию Supabase в cookies и не пускать на экраны без входа.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { CONFIGURED, SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase/env';
import { DEV_MEMORY } from '@/lib/server/devstore';

export async function proxy(req: NextRequest) {
  if (DEV_MEMORY) return NextResponse.next();
  const p = req.nextUrl.pathname;
  const open = p === '/login' || p.startsWith('/auth/') || p.startsWith('/api/');
  if (!CONFIGURED) return open ? NextResponse.next() : NextResponse.redirect(new URL('/login', req.url));
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && !open) return NextResponse.redirect(new URL('/login', req.url));
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
