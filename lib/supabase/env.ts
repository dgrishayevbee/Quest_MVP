// Настройки Supabase из переменных окружения (.env.local локально, Environment Variables на Vercel).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// Публичный ключ: новое имя в панели Supabase — PUBLISHABLE_KEY, старое — ANON_KEY. Подходит любое.
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Игрок один: войти может только этот адрес.
export const CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY);
export const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL ?? '').trim().toLowerCase();
