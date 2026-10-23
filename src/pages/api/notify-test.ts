import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../lib/supabase';
import { getChatId, json, rateLimit, sendToN8n } from '../../lib/n8n';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createAstroSupabaseClient(request, cookies);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, message: 'Silakan login terlebih dahulu' }, 401);

    const wait = rateLimit(`notify-test:${user.id}`);
    if (wait) return json({ ok: false, message: `Tunggu ${wait} detik sebelum mencoba lagi` }, 429);

    const chatId = await getChatId(supabase, user.id);
    const result = await sendToN8n('tugas-baru', {
      type: 'TEST',
      record: {
        title: 'Tes notifikasi',
        deadline: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
        ...(chatId ? { chat_id: chatId } : {}),
      },
    });
    return json(result, result.ok ? 200 : 502);
  } catch (err) {
    console.error('[notify-test]', err);
    return json({ ok: false, message: 'Terjadi kesalahan server' }, 500);
  }
};
