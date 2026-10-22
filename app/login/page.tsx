'use client';
// Вход по ссылке на почту (magic link). Новых пользователей не создаём: игрок один.
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CONFIGURED, SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase/env';

export default function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (new URLSearchParams(location.search).has('error')) setState('error'); }, []);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) { setState('error'); setMsg(error.message); } else setState('sent');
  };
  return (
    <main className="gutter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <form className="sheet" onSubmit={send}>
        <span className="pin" aria-hidden="true" />
        <span className="kicker">Путь проводника</span>
        <h2>Вход в гильдию</h2>
        {!CONFIGURED ? <p className="brief">Сайт не подключён к базе: задай NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY (см. .env.example) и пересобери.</p>
          : state === 'sent'
          ? <p className="brief">Ссылка отправлена на {email.trim()}. Открой письмо на этом устройстве.</p>
          : <>
            <p className="brief">Пришлём ссылку для входа на почту.</p>
            <label className="f" htmlFor="email">Почта</label>
            <input type="text" inputMode="email" autoComplete="email" id="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', borderRadius: 6, padding: '10px 12px', fontSize: 14.5, background: '#FBF4E4', border: '1px solid #C2A877', color: 'var(--pink)' }} />
            {state === 'error' && <p className="story">{msg || 'Ссылка не сработала или почта не та. Попробуй ещё раз.'}</p>}
            <div className="acts"><button className="btn rust" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Отправляю…' : 'Получить ссылку'}</button></div>
          </>}
      </form>
    </main>
  );
}
