import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { forbiddenWorkspace, getWorkspaceRole } from '../../../lib/workspace-auth';

// DELETE /api/workspaces/:id — hapus workspace beserta seluruh isinya.
// Hanya OWNER yang boleh menghapus.
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const workspaceId = params.id;
  if (!workspaceId) return new Response(JSON.stringify({ error: 'Workspace ID required' }), { status: 400 });

  const role = await getWorkspaceRole(supabase, user.id, workspaceId);
  if (role !== 'owner') {
    return forbiddenWorkspace('Hanya owner workspace yang boleh menghapus workspace ini');
  }

  // Hapus manual berurutan agar aman walau FK belum ON DELETE CASCADE.
  // Urutan: materi -> task children -> tasks -> invites -> members -> workspace.
  const { data: tasks } = await supabase.from('tasks').select('id').eq('workspace_id', workspaceId);
  const taskIds = (tasks || []).map((t: any) => t.id);

  if (taskIds.length > 0) {
    await supabase.from('subtasks').delete().in('task_id', taskIds);
    await supabase.from('task_comments').delete().in('task_id', taskIds);
    await supabase.from('task_assignments').delete().in('task_id', taskIds);
    await supabase.from('activity_logs').delete().in('task_id', taskIds);
    await supabase.from('task_attachments').delete().in('task_id', taskIds);
    await supabase.from('task_tags').delete().in('task_id', taskIds);
  }
  await supabase.from('tags').delete().eq('workspace_id', workspaceId);
  // Tabel materi mungkin belum ada di DB lama — abaikan errornya supaya
  // hapus workspace tetap jalan. Supabase mengembalikan { error }, bukan throw,
  // jadi bungkus try/catch juga untuk keamanan network.
  try {
    await supabase.from('workspace_materials').delete().eq('workspace_id', workspaceId);
  } catch {
    // Abaikan: DB lama belum punya tabel workspace_materials.
  }
  await supabase.from('tasks').delete().eq('workspace_id', workspaceId);
  await supabase.from('workspace_invites').delete().eq('workspace_id', workspaceId);
  await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);

  const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
