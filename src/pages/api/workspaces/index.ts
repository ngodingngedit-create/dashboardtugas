import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/auth-helpers';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Nama workspace minimal 2 karakter' }), { status: 400 });
    }

    // Pastikan profile user ada di tabel public.profiles untuk menghindari foreign key violation
    await ensureUserProfile(supabase, user);

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify(workspace), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal membuat workspace' }), { status: 500 });
  }
};

