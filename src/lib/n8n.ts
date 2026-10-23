// Server-only: membaca N8N_* dari env server. Jangan import dari <script> klien.
if (import.meta.env.SSR === false) {
  throw new Error('src/lib/n8n.ts hanya boleh dipakai di server');
}

export interface N8nResult {
  ok: boolean;
  message: string;
}

export async function sendToN8n(path: string, payload: unknown): Promise<N8nResult> {
  const baseUrl = import.meta.env.N8N_BASE_URL;
  const apiKey = import.meta.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    console.error('[n8n] N8N_BASE_URL / N8N_API_KEY belum diset');
    return { ok: false, message: 'Integrasi notifikasi belum dikonfigurasi' };
  }
  if (!/^[a-z0-9-]{1,64}$/.test(path)) {
    return { ok: false, message: 'Path webhook tidak valid' };
  }

  const prefix = import.meta.env.N8N_WEBHOOK_PREFIX === 'webhook-test' ? 'webhook-test' : 'webhook';

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/${prefix}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[n8n] ${path} -> HTTP ${res.status}`);
      return { ok: false, message: 'Layanan notifikasi menolak permintaan' };
    }
    return { ok: true, message: 'Notifikasi terkirim' };
  } catch (err: any) {
    const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error(`[n8n] ${path} gagal:`, err?.name, err?.message);
    return { ok: false, message: timeout ? 'Layanan notifikasi tidak merespons' : 'Gagal menghubungi layanan notifikasi' };
  }
}

// ponytail: Map per instance serverless; batas bisa bocor antar instance/cold start.
// Upgrade ke tabel Supabase atau Upstash Redis bila butuh limit ketat.
const lastHit = new Map<string, number>();

/** Mengembalikan sisa detik tunggu (0 = boleh lanjut, dan langsung dicatat). */
export function rateLimit(key: string, windowMs = 30_000): number {
  const now = Date.now();
  const prev = lastHit.get(key) ?? 0;
  if (now - prev < windowMs) return Math.ceil((windowMs - (now - prev)) / 1000);
  lastHit.set(key, now);
  if (lastHit.size > 5000) {
    for (const [k, t] of lastHit) if (now - t >= windowMs) lastHit.delete(k);
  }
  return 0;
}

export function json(body: N8nResult, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Ambil chat_id Telegram user (null jika kolom belum ada / kosong). */
export async function getChatId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('telegram_chat_id').eq('id', userId).single();
  if (error) return null;
  return data?.telegram_chat_id || null;
}
