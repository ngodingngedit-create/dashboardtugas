import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../../lib/supabase';
import { forbiddenWorkspace, getTaskWorkspaceId, isWorkspaceMember } from '../../../../lib/workspace-auth';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const taskId = params.id;
  if (!taskId) return new Response(JSON.stringify({ error: 'Task ID required' }), { status: 400 });

  const workspaceId = await getTaskWorkspaceId(supabase, taskId);
  if (!workspaceId || !(await isWorkspaceMember(supabase, user.id, workspaceId))) {
    return forbiddenWorkspace();
  }

  try {
    const { title } = await request.json();
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'Judul checklist wajib diisi' }), { status: 400 });
    }

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title: title.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(subtask), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error' }), { status: 500 });
  }
};
