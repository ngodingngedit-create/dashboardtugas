# Supabase — Checklist Migrasi

Repo ini memakai RLS per-workspace. Setiap ganti database / project Supabase baru,
jalankan file-file ini **berurutan** di Dashboard > SQL Editor > New Query > Run:

1. Skema utama + RLS (wajib):
   - `supabase/workspace-rls.sql` — bikin helper `is_workspace_member()`,
     `is_workspace_owner_or_admin()`, aktifkan RLS, dan pasang semua policy
     termasuk `materials_*` untuk `public.workspace_materials`.
2. Tabel materi (wajib untuk halaman Materi / Catatan):
   - `supabase/workspace-materials.sql` — `CREATE TABLE public.workspace_materials` + policy-nya.
   - Idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`), aman di-Run ulang.

3. Setelah bikin tabel baru / ubah skema, refresh schema cache PostgREST:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   Tunggu ±1 menit lalu coba lagi. Tanpa ini error yang muncul:
   `Could not find the table 'public.workspace_materials' in the schema cache`
   (kode PostgREST `PGRST205`).

4. Verifikasi cepat:
   ```sql
   SELECT * FROM public.workspace_materials LIMIT 1;
   SELECT * FROM pg_policies WHERE tablename = 'workspace_materials';
   ```

Catatan aplikasi:
- `GET/POST /api/workspaces/:id/materials` dan `PATCH/DELETE /api/materials/:id`
  mengembalikan `503 { code: 'MATERIALS_TABLE_MISSING' }` + pesan cara migrasi
  saat tabel belum ada, supaya tidak lagi muncul pesan mentah schema-cache ke user.
- Halaman `/dashboard/workspaces/:id` menampilkan banner kuning saat tabel belum ada.
