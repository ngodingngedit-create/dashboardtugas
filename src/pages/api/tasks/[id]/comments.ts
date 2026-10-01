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
    const { content } = await request.json();
    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Komentar tidak boleh kosong' }), { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(comment), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
