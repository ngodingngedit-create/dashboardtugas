import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { forbiddenWorkspace, getSubtaskWorkspaceId, isWorkspaceMember } from '../../../lib/workspace-auth';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const subtaskId = params.id;
  if (!subtaskId) return new Response(JSON.stringify({ error: 'Subtask ID required' }), { status: 400 });

  // Pastikan user adalah anggota workspace pemilik subtask ini.
  const workspaceId = await getSubtaskWorkspaceId(supabase, subtaskId);
  if (!workspaceId || !(await isWorkspaceMember(supabase, user.id, workspaceId))) {
    return forbiddenWorkspace();
  }

  try {
    const { is_completed } = await request.json();
    const { data, error } = await supabase
      .from('subtasks')
      .update({ is_completed })
      .eq('id', subtaskId)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
