import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';
import { json } from '../../../lib/n8n';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createAstroSupabaseClient(request, cookies);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, message: 'Silakan login terlebih dahulu' }, 401);

    const body = await request.json().catch(() => null);
    const raw = typeof body?.telegram_chat_id === 'string' ? body.telegram_chat_id.trim() : '';
    if (raw && !/^-?\d{1,20}$/.test(raw)) {
      return json({ ok: false, message: 'Chat ID harus berupa angka (boleh diawali tanda minus)' }, 400);
    }

    const { error } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: raw || null })
      .eq('id', user.id);
    if (error) {
      console.error('[profile/telegram]', error.message);
      return json({ ok: false, message: 'Gagal menyimpan. Pastikan SQL supabase/telegram-chat-id.sql sudah dijalankan.' }, 400);
    }
    return json({ ok: true, message: raw ? 'Chat ID tersimpan' : 'Chat ID dihapus' }, 200);
  } catch (err) {
    console.error('[profile/telegram]', err);
    return json({ ok: false, message: 'Terjadi kesalahan server' }, 500);
  }
};
