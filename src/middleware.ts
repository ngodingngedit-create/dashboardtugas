import { defineMiddleware } from 'astro:middleware';
import { createAstroSupabaseClient } from './lib/supabase';

// Rute publik yang dapat diakses tanpa login
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/logout', '/join/'];

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, locals, url }, next) => {
  const supabase = createAstroSupabaseClient(request, cookies);

  // Pasang supabase client di locals agar bisa diakses di semua halaman jika diperlukan
  (locals as any).supabase = supabase;

  // Cek session user saat ini
  const { data: { user } } = await supabase.auth.getUser();
  (locals as any).user = user;

  const pathname = url.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Jika user sudah login dan mengakses halaman /login atau /register
  if (user && (pathname === '/login' || pathname === '/register')) {
    const redirectTo = url.searchParams.get('redirect') || '/dashboard';
    return redirect(redirectTo);
  }

  // Jika belum login dan mengakses halaman privat
  if (!user && !isPublicRoute && pathname !== '/') {
    return redirect(`/login?redirect=${encodeURIComponent(pathname + url.search)}`);
  }

  return next();
});

