import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../lib/supabase';
import { getTaskWorkspaceId, isWorkspaceMember } from '../../lib/workspace-auth';
import { getChatId, json, rateLimit, sendToN8n } from '../../lib/n8n';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createAstroSupabaseClient(request, cookies);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, message: 'Silakan login terlebih dahulu' }, 401);

    const body = await request.json().catch(() => null);
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    if (!UUID.test(taskId)) return json({ ok: false, message: 'task_id tidak valid' }, 400);

    const workspaceId = await getTaskWorkspaceId(supabase, taskId);
    if (!workspaceId || !(await isWorkspaceMember(supabase, user.id, workspaceId))) {
      return json({ ok: false, message: 'Tugas tidak ditemukan' }, 403);
    }

    const wait = rateLimit(`remind:${user.id}`);
    if (wait) return json({ ok: false, message: `Tunggu ${wait} detik sebelum mencoba lagi` }, 429);

    const { data: task } = await supabase.from('tasks').select('title, due_date').eq('id', taskId).single();
    if (!task) return json({ ok: false, message: 'Tugas tidak ditemukan' }, 404);

    const chatId = await getChatId(supabase, user.id);
    const result = await sendToN8n('tugas-ingatkan', {
      type: 'REMIND',
      record: {
        title: String(task.title ?? '').slice(0, 200),
        deadline: task.due_date ? String(task.due_date).slice(0, 32) : null,
        ...(chatId ? { chat_id: chatId } : {}),
      },
    });
    return json(result.ok ? { ok: true, message: 'Pengingat dikirim ke Telegram' } : result, result.ok ? 200 : 502);
  } catch (err) {
    console.error('[remind]', err);
    return json({ ok: false, message: 'Terjadi kesalahan server' }, 500);
  }
};
