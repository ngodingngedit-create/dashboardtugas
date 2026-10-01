import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../../lib/supabase';
import { forbiddenWorkspace, getWorkspaceRole } from '../../../../lib/workspace-auth';

// DELETE /api/workspaces/:id/leave — keluar dari workspace sharing.
// Owner tidak boleh keluar (harus hapus workspace); non-member -> 403.
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const workspaceId = params.id;
  if (!workspaceId) return new Response(JSON.stringify({ error: 'Workspace ID required' }), { status: 400 });

  const role = await getWorkspaceRole(supabase, user.id, workspaceId);
  if (!role) return forbiddenWorkspace();
  if (role === 'owner') {
    return new Response(
      JSON.stringify({ error: 'Owner tidak bisa keluar. Hapus workspace jika ingin menutupnya.' }),
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
