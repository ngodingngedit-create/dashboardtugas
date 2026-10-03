-- =====================================================================
-- TaskPilot: index performa (idempotent — aman di-Run ulang)
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste file ini > Run.
-- Cek dulu yang belum ada:
--   SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
-- Setelah Run: NOTIFY pgrst, 'reload schema';
-- =====================================================================

-- tasks: filter board/home per workspace (query terpanas)
CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx
  ON public.tasks (workspace_id);

-- tasks: home memfilter created_by + status
CREATE INDEX IF NOT EXISTS tasks_created_by_status_idx
  ON public.tasks (created_by, status);

-- tasks: sort due_date di home
CREATE INDEX IF NOT EXISTS tasks_due_date_idx
  ON public.tasks (due_date);

-- workspace_members: daftar workspace per user + cek membership
CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx
  ON public.workspace_members (user_id);

CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx
  ON public.workspace_members (workspace_id);

-- subtasks: join subtasks per task di board & detail
CREATE INDEX IF NOT EXISTS subtasks_task_id_idx
  ON public.subtasks (task_id);

-- task_comments: list komentar per task
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx
  ON public.task_comments (task_id);

-- activity_logs: riwayat per task (di-order desc)
CREATE INDEX IF NOT EXISTS activity_logs_task_id_idx
  ON public.activity_logs (task_id);

-- task_attachments: lampiran per task
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx
  ON public.task_attachments (task_id);

-- task_assignments: tugas saya per user
CREATE INDEX IF NOT EXISTS task_assignments_user_id_idx
  ON public.task_assignments (user_id);

CREATE INDEX IF NOT EXISTS task_assignments_task_id_idx
  ON public.task_assignments (task_id);

-- workspace_materials: materi per workspace (di-order updated_at desc)
CREATE INDEX IF NOT EXISTS workspace_materials_workspace_updated_idx
  ON public.workspace_materials (workspace_id, updated_at DESC);

-- workspace_invites: lookup token invite + per workspace
CREATE INDEX IF NOT EXISTS workspace_invites_token_idx
  ON public.workspace_invites (token);

CREATE INDEX IF NOT EXISTS workspace_invites_workspace_id_idx
  ON public.workspace_invites (workspace_id);
