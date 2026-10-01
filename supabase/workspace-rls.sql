-- =====================================================================
-- TaskPilot: Isolasi workspace per-login (Row Level Security)
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste file ini > Run.
-- Aman dijalankan ulang (idempotent: DROP POLICY IF EXISTS dulu).
-- =====================================================================

-- 1. Aktifkan RLS di semua tabel produk
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- 2. Helper: cek keanggotaan tanpa rekursi RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner_or_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;


-- 3. PROFILES: user bisa lihat semua profil (untuk avatar/nama tim),
--    tapi hanya bisa ubah profilnya sendiri.
DROP POLICY IF EXISTS "profiles_select_members" ON public.profiles;
CREATE POLICY "profiles_select_members" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 4. WORKSPACES: hanya terlihat oleh anggotanya.
DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member" ON public.workspaces
  FOR SELECT TO authenticated USING (public.is_workspace_member(id));

DROP POLICY IF EXISTS "workspaces_insert_auth" ON public.workspaces;
CREATE POLICY "workspaces_insert_auth" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "workspaces_update_admin" ON public.workspaces;
CREATE POLICY "workspaces_update_admin" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner_or_admin(id))
  WITH CHECK (public.is_workspace_owner_or_admin(id));

DROP POLICY IF EXISTS "workspaces_delete_admin" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_owner" ON public.workspaces;
CREATE POLICY "workspaces_delete_owner" ON public.workspaces
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- 5. MEMBERS: hanya bisa lihat daftar member workspace-nya sendiri.
DROP POLICY IF EXISTS "members_select_own" ON public.workspace_members;
CREATE POLICY "members_select_own" ON public.workspace_members
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "members_insert_self" ON public.workspace_members;
CREATE POLICY "members_insert_self" ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_delete_admin" ON public.workspace_members;
CREATE POLICY "members_delete_admin" ON public.workspace_members
  FOR DELETE TO authenticated USING (public.is_workspace_owner_or_admin(workspace_id));

-- Anggota boleh keluar sendiri (hapus baris miliknya). Owner tidak boleh keluar via API.
DROP POLICY IF EXISTS "members_delete_self" ON public.workspace_members;
CREATE POLICY "members_delete_self" ON public.workspace_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_update_admin" ON public.workspace_members;
CREATE POLICY "members_update_admin" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner_or_admin(workspace_id))
  WITH CHECK (public.is_workspace_owner_or_admin(workspace_id));

-- 6. INVITES: hanya owner/admin yang bisa kelola; join page baca by token.
DROP POLICY IF EXISTS "invites_select_admin" ON public.workspace_invites;
CREATE POLICY "invites_select_admin" ON public.workspace_invites
  FOR SELECT TO authenticated USING (public.is_workspace_owner_or_admin(workspace_id));

DROP POLICY IF EXISTS "invites_select_by_token" ON public.workspace_invites;
CREATE POLICY "invites_select_by_token" ON public.workspace_invites
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "invites_insert_admin" ON public.workspace_invites;
CREATE POLICY "invites_insert_admin" ON public.workspace_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner_or_admin(workspace_id) AND auth.uid() = invited_by);

DROP POLICY IF EXISTS "invites_delete_admin" ON public.workspace_invites;
CREATE POLICY "invites_delete_admin" ON public.workspace_invites
  FOR DELETE TO authenticated USING (public.is_workspace_owner_or_admin(workspace_id));

-- 7. TASKS: hanya anggota workspace pemilik task.
DROP POLICY IF EXISTS "tasks_select_member" ON public.tasks;
CREATE POLICY "tasks_select_member" ON public.tasks
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "tasks_insert_member" ON public.tasks;
CREATE POLICY "tasks_insert_member" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "tasks_update_member" ON public.tasks;
CREATE POLICY "tasks_update_member" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "tasks_delete_member" ON public.tasks;
CREATE POLICY "tasks_delete_member" ON public.tasks
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));

-- 8. Tabel anak task: akses mengikuti workspace dari parent task.
DROP POLICY IF EXISTS "subtasks_member" ON public.subtasks;
CREATE POLICY "subtasks_member" ON public.subtasks
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND public.is_workspace_member(t.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND public.is_workspace_member(t.workspace_id)));

DROP POLICY IF EXISTS "comments_member" ON public.task_comments;
CREATE POLICY "comments_member" ON public.task_comments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id AND public.is_workspace_member(t.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id AND public.is_workspace_member(t.workspace_id)));

DROP POLICY IF EXISTS "assignments_member" ON public.task_assignments;
CREATE POLICY "assignments_member" ON public.task_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND public.is_workspace_member(t.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignments.task_id AND public.is_workspace_member(t.workspace_id)));

DROP POLICY IF EXISTS "activity_member" ON public.activity_logs;
CREATE POLICY "activity_member" ON public.activity_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = activity_logs.task_id AND public.is_workspace_member(t.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = activity_logs.task_id AND public.is_workspace_member(t.workspace_id)));

DROP POLICY IF EXISTS "attachments_member" ON public.task_attachments;
CREATE POLICY "attachments_member" ON public.task_attachments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND public.is_workspace_member(t.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND public.is_workspace_member(t.workspace_id)));

DROP POLICY IF EXISTS "tags_member" ON public.tags;
CREATE POLICY "tags_member" ON public.tags
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "task_tags_member" ON public.task_tags;
CREATE POLICY "task_tags_member" ON public.task_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_tags.task_id AND public.is_workspace_member(t.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_tags.task_id AND public.is_workspace_member(t.workspace_id)));

-- 9. MATERI: semua anggota workspace boleh baca & tulis; non-anggota tidak bisa akses.
DROP POLICY IF EXISTS "materials_select_member" ON public.workspace_materials;
CREATE POLICY "materials_select_member" ON public.workspace_materials
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "materials_insert_member" ON public.workspace_materials;
CREATE POLICY "materials_insert_member" ON public.workspace_materials
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "materials_update_member" ON public.workspace_materials;
CREATE POLICY "materials_update_member" ON public.workspace_materials
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "materials_delete_member" ON public.workspace_materials;
CREATE POLICY "materials_delete_member" ON public.workspace_materials
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id));


