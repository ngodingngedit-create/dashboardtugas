-- =============================================================
-- Superadmin Global
-- Jalankan file ini di Supabase SQL Editor.
-- Menambahkan kolom profiles.is_admin dan policy agar superadmin
-- bisa MEMBACA semua workspace, member, dan tugas (monitoring).
-- =============================================================

-- 1. Kolom flag admin global
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Helper function (security definer agar bisa dipakai di RLS)
create or replace function public.is_global_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 3. Policy SELECT tambahan khusus superadmin (baca saja)
--    Policy lama berbasis membership tetap berlaku (RLS bersifat OR).

drop policy if exists "global admin can read all workspaces" on public.workspaces;
create policy "global admin can read all workspaces"
  on public.workspaces for select
  using (public.is_global_admin());

drop policy if exists "global admin can read all workspace members" on public.workspace_members;
create policy "global admin can read all workspace members"
  on public.workspace_members for select
  using (public.is_global_admin());

drop policy if exists "global admin can read all tasks" on public.tasks;
create policy "global admin can read all tasks"
  on public.tasks for select
  using (public.is_global_admin());

-- 4. Jadikan akun Anda superadmin (ganti email di bawah ini):
-- update public.profiles
--   set is_admin = true
--   where id = (select id from auth.users where email = 'email-anda@contoh.com');
