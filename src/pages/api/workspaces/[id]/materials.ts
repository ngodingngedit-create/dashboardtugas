import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../../lib/supabase';
import { ensureUserProfile } from '../../../../lib/auth-helpers';
import { forbiddenWorkspace, isWorkspaceMember } from '../../../../lib/workspace-auth';

// GET /api/workspaces/:id/materials — daftar materi (semua anggota boleh baca).
export const GET: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const workspaceId = params.id;
  if (!workspaceId) return new Response(JSON.stringify({ error: 'Workspace ID required' }), { status: 400 });
  if (!(await isWorkspaceMember(supabase, user.id, workspaceId))) return forbiddenWorkspace();

  const { data, error } = await supabase
    .from('workspace_materials')
    .select('*, author:profiles!workspace_materials_created_by_fkey (id, full_name, avatar_url)')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify(data || []), { status: 200 });
};

// POST /api/workspaces/:id/materials — tambah materi (semua anggota boleh tulis).
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const workspaceId = params.id;
  if (!workspaceId) return new Response(JSON.stringify({ error: 'Workspace ID required' }), { status: 400 });
  if (!(await isWorkspaceMember(supabase, user.id, workspaceId))) return forbiddenWorkspace();

  await ensureUserProfile(supabase, user);

  try {
    const body = await request.json();
    const title = body.title?.toString().trim();
    const content = body.content?.toString().trim() || null;
    const linkUrl = body.link_url?.toString().trim() || null;

    if (!title || title.length < 2) {
      return new Response(JSON.stringify({ error: 'Judul materi minimal 2 karakter' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('workspace_materials')
      .insert({ workspace_id: workspaceId, title, content, link_url: linkUrl, created_by: user.id })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal menyimpan materi' }), { status: 500 });
  }
};
