import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { forbiddenWorkspace, getMaterialWorkspaceId, isWorkspaceMember } from '../../../lib/workspace-auth';

async function authorize(supabase: any, userId: string, materialId: string) {
  const workspaceId = await getMaterialWorkspaceId(supabase, materialId);
  if (!workspaceId || !(await isWorkspaceMember(supabase, userId, workspaceId))) return null;
  return workspaceId;
}

// PATCH /api/materials/:id — ubah materi (semua anggota workspace boleh tulis).
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const materialId = params.id;
  if (!materialId) return new Response(JSON.stringify({ error: 'Material ID required' }), { status: 400 });
  if (!(await authorize(supabase, user.id, materialId))) return forbiddenWorkspace();

  try {
    const body = await request.json();
    const updatePayload: Record<string, any> = {};
    if (body.title !== undefined) updatePayload.title = body.title?.toString().trim();
    if (body.content !== undefined) updatePayload.content = body.content?.toString().trim() || null;
    if (body.link_url !== undefined) updatePayload.link_url = body.link_url?.toString().trim() || null;
    if (updatePayload.title !== undefined && updatePayload.title.length < 2) {
      return new Response(JSON.stringify({ error: 'Judul materi minimal 2 karakter' }), { status: 400 });
    }
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('workspace_materials')
      .update(updatePayload)
      .eq('id', materialId)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal memperbarui materi' }), { status: 500 });
  }
};

// DELETE /api/materials/:id — hapus materi (semua anggota workspace boleh tulis).
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const materialId = params.id;
  if (!materialId) return new Response(JSON.stringify({ error: 'Material ID required' }), { status: 400 });
  if (!(await authorize(supabase, user.id, materialId))) return forbiddenWorkspace();

  const { error } = await supabase.from('workspace_materials').delete().eq('id', materialId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
