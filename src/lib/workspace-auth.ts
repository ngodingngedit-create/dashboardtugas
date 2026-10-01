import type { SupabaseClient } from '@supabase/supabase-js';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

/** Ambil role user di sebuah workspace, null jika bukan anggota. */
export async function getWorkspaceRole(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<Role | null> {
  if (!userId || !workspaceId) return null;
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();
  return (data?.role as Role) ?? null;
}

/** True jika user adalah member workspace tersebut (role apapun). */
export async function isWorkspaceMember(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const role = await getWorkspaceRole(supabase, userId, workspaceId);
  return role !== null;
}

/** True jika user punya salah satu role yang diizinkan. */
export async function hasWorkspaceRole(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  allowed: Role[]
): Promise<boolean> {
  const role = await getWorkspaceRole(supabase, userId, workspaceId);
  return role !== null && allowed.includes(role);
}

/** Ambil workspace_id dari sebuah task. */
export async function getTaskWorkspaceId(
  supabase: SupabaseClient,
  taskId: string
): Promise<string | null> {
  if (!taskId) return null;
  const { data } = await supabase.from('tasks').select('workspace_id').eq('id', taskId).single();
  return (data?.workspace_id as string) ?? null;
}

/** Ambil workspace_id dari sebuah subtask (via parent task). */
export async function getSubtaskWorkspaceId(
  supabase: SupabaseClient,
  subtaskId: string
): Promise<string | null> {
  if (!subtaskId) return null;
  const { data } = await supabase
    .from('subtasks')
    .select('task:tasks (workspace_id)')
    .eq('id', subtaskId)
    .single();
  const task = (data as any)?.task;
  return task?.workspace_id ?? null;
}

/** Ambil workspace_id dari sebuah materi. */
export async function getMaterialWorkspaceId(
  supabase: SupabaseClient,
  materialId: string
): Promise<string | null> {
  if (!materialId) return null;
  const { data } = await supabase
    .from('workspace_materials')
    .select('workspace_id')
    .eq('id', materialId)
    .single();
  return (data?.workspace_id as string) ?? null;
}

export function forbiddenWorkspace(message = 'Anda bukan anggota workspace ini') {
  return new Response(JSON.stringify({ error: message }), { status: 403 });
}
