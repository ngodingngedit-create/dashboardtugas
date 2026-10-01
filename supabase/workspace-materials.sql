-- =====================================================================
-- TaskPilot: tabel materi per-workspace (teks + link)
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste file ini > Run.
-- Workspace lama & baru otomatis bisa pakai (relasi kosong = "belum ada materi").
-- Semua anggota workspace boleh BACA & TULIS; non-anggota tidak bisa akses.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.workspace_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  link_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_materials_workspace_idx
  ON public.workspace_materials(workspace_id);

ALTER TABLE public.workspace_materials ENABLE ROW LEVEL SECURITY;

-- Helper is_workspace_member() sudah didefinisikan di workspace-rls.sql.
-- Jalankan workspace-rls.sql dulu (atau pastikan function-nya ada) sebelum file ini.
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
