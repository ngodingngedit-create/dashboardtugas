import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function ensureUserProfile(supabase: SupabaseClient, user: User) {
  // Cek apakah profil sudah ada
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingProfile) {
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';

    const username =
      (user.email ? user.email.split('@')[0] : 'user').toLowerCase().replace(/[^a-z0-9_]/g, '') +
      '_' +
      user.id.substring(0, 5);

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName,
        username: username,
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      { onConflict: 'id' }
    );

    if (error) {
      throw new Error(`Gagal membuat profil user: ${error.message}`);
    }
  }
}
