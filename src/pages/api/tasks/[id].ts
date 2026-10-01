import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { forbiddenWorkspace, getTaskWorkspaceId, isWorkspaceMember } from '../../../lib/workspace-auth';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const taskId = params.id;
  if (!taskId) return new Response(JSON.stringify({ error: 'Task ID required' }), { status: 400 });

  // Pastikan user adalah anggota workspace pemilik task ini.
  const workspaceId = await getTaskWorkspaceId(supabase, taskId);
  if (!workspaceId || !(await isWorkspaceMember(supabase, user.id, workspaceId))) {
    return forbiddenWorkspace();
  }

  try {
    const body = await request.json();
    const allowedUpdates = ['status', 'priority', 'title', 'description', 'due_date', 'position'];
    const updatePayload: Record<string, any> = {};

    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updatePayload[key] = body[key];
      }
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify(updatedTask), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal memperbarui tugas' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const taskId = params.id;
  if (!taskId) return new Response(JSON.stringify({ error: 'Task ID required' }), { status: 400 });

  const workspaceId = await getTaskWorkspaceId(supabase, taskId);
  if (!workspaceId || !(await isWorkspaceMember(supabase, user.id, workspaceId))) {
    return forbiddenWorkspace();
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
