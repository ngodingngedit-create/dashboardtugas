import { defineMiddleware } from 'astro:middleware';
import { createAstroSupabaseClient } from './lib/supabase';
import { logPerf, timed, toServerTimingValue, type TimingEntry } from './lib/perf';

// Rute publik yang dapat diakses tanpa login
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/logout', '/join/'];

// Aset statis PWA + halaman offline — lewati auth sepenuhnya (jangan redirect ke /login,
// dan jangan sentuh request.headers agar halaman prerender tidak memicu warning build).
// Penting untuk install prompt & service worker.
const BYPASS_AUTH_PREFIXES = ['/icons/', '/_astro/', '/offline/', '/offline'];
const BYPASS_AUTH_FILES = ['/sw.js', '/manifest.webmanifest', '/favicon.svg', '/favicon.ico', '/offline'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect, locals, url } = context;
  const rawPathname = url.pathname;
  const pathname = rawPathname.replace(/\/$/, '') || '/';

  if (
    BYPASS_AUTH_FILES.includes(pathname) ||
    BYPASS_AUTH_PREFIXES.some((prefix) => rawPathname.startsWith(prefix))
  ) {
    return next();
  }

  // Fase 0: ukur biaya auth middleware (1x getUser per request).
  const timings: TimingEntry[] = [];
  const supabase = createAstroSupabaseClient(request, cookies);

  // Pasang supabase client di locals agar bisa diakses di semua halaman jika diperlukan
  (locals as any).supabase = supabase;

  // Cek session user saat ini
  const { data: { user } } = await timed('mw-getUser', () => supabase.auth.getUser(), timings);
  (locals as any).user = user;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Jika user sudah login dan mengakses halaman /login atau /register
  if (user && (pathname === '/login' || pathname === '/register')) {
    const redirectTo = url.searchParams.get('redirect') || '/dashboard/home';
    return redirect(redirectTo);
  }

  // Jika belum login dan mengakses halaman privat
  if (!user && !isPublicRoute && pathname !== '/') {
    return redirect(`/login?redirect=${encodeURIComponent(pathname + url.search)}`);
  }

  const response = await next();
  // Teruskan timing middleware; halaman menimpa/append via Astro.response.headers jika mau.
  // Di sini kita gabungkan dengan header yang sudah ada dari halaman.
  const existing = response.headers.get('Server-Timing');
  const ours = toServerTimingValue(timings);
  response.headers.set('Server-Timing', existing ? `${existing}, ${ours}` : ours);
  response.headers.set('X-Middleware-Duration', String(timings.reduce((s, t) => s + t.ms, 0)));
  logPerf(`mw ${pathname}`, timings);
  return response;
});

