-- =====================================================================
-- TaskPilot: FIX SEKALI TEMPEL untuk error
--   "Tabel materi belum tersedia di database" /
--   "Could not find the table 'public.workspace_materials' in the schema cache"
--
-- Cara pakai: Supabase Dashboard > SQL Editor > New query >
-- paste SELURUH file ini > Run. Tunggu ±1 menit, refresh halaman materi.
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- 1. Helper keanggotaan (dibutuhkan oleh POLICY di bawah).
--    CREATE OR REPLACE jadi aman walau function sudah ada.
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

-- 2. Tabel materi.
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

-- 3. Policy: semua anggota workspace boleh baca & tulis.
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

-- 4. Verifikasi langsung di output query (harus 1 baris, tidak error).
SELECT COUNT(*) AS workspace_materials_ok FROM public.workspace_materials;
SELECT policyname FROM pg_policies WHERE tablename = 'workspace_materials' ORDER BY 1;
