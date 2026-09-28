import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  await supabase.auth.signOut();
  return redirect('/login');
};
