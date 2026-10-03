import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { ensureUserProfile } from '../../../lib/auth-helpers';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Nama workspace minimal 2 karakter' }), { status: 400 });
    }

    // Pastikan profile user ada di tabel public.profiles untuk menghindari foreign key violation.
    // Fail-fast: jangan lanjut insert workspace kalau profile gagal dibuat.
    try {
      await ensureUserProfile(supabase, user);
    } catch (profileErr: any) {
      return new Response(
        JSON.stringify({ error: profileErr.message || 'Gagal membuat profil user' }),
        { status: 500 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    // Daftarkan pembuat sebagai owner agar workspace muncul di daftar miliknya
    // (daftar workspace diambil dari tabel workspace_members per user).
    // Pakai upsert agar idempotent: kalau DB punya trigger auto-add owner,
    // atau user double-klik submit, tidak error "duplicate key unique_workspace_user".
    // Rollback (hapus workspace) HANYA untuk error selain duplikat.
    const { error: memberError } = await supabase.from('workspace_members').upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      },
      { onConflict: 'workspace_id,user_id' }
    );

    if (memberError) {
      const isDuplicate =
        memberError.code === '23505' ||
        (memberError.message || '').toLowerCase().includes('duplicate key') ||
        (memberError.message || '').toLowerCase().includes('unique_workspace_user');

      // Kalau cuma duplikat (owner sudah terdaftar via trigger / retry),
      // anggap sukses — jangan hapus workspace yang baru dibuat.
      if (!isDuplicate) {
        await supabase.from('workspaces').delete().eq('id', workspace.id);
        return new Response(
          JSON.stringify({ error: `Gagal mendaftarkan owner workspace: ${memberError.message}` }),
          { status: 500 }
        );
      }
    }

    return new Response(JSON.stringify(workspace), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal membuat workspace' }), { status: 500 });
  }
};

