import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/auth-helpers';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const { workspace_id, title, description, priority, due_date } = body;

    if (!workspace_id || !title) {
      return new Response(JSON.stringify({ error: 'Workspace dan Judul tugas wajib diisi' }), { status: 400 });
    }

    // Pastikan profile user ada di tabel public.profiles
    await ensureUserProfile(supabase, user);

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id,
        title,
        description: description || null,
        priority: priority || 'medium',
        status: 'todo',
        due_date: due_date ? new Date(due_date).toISOString() : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify(task), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal membuat tugas' }), { status: 500 });
  }
};

