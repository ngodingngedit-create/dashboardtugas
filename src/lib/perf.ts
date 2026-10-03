/**
 * Helper pengukuran performa server (Fase 0).
 * Dipakai di middleware + halaman dashboard untuk memecah TTFB per-query.
 * Hasilnya dikirim via header `Server-Timing` (lihat di DevTools > Network > Timing)
 * dan di-log ke console server (Vercel Functions Logs).
 */

export interface TimingEntry {
  label: string;
  ms: number;
}

/** Jalankan fn sambil mencatat durasinya ke `arr`. */
export async function timed<T>(label: string, fn: () => Promise<T>, arr: TimingEntry[]): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    arr.push({ label, ms: Math.round(performance.now() - start) });
  }
}

/** Format header Server-Timing: `label;dur=ms`. */
export function toServerTimingValue(entries: TimingEntry[]): string {
  return entries
    .map((e) => `${e.label.replace(/[^a-zA-Z0-9_-]/g, '_')};dur=${Math.max(0, Math.round(e.ms))}`)
    .join(', ');
}

/** Log satu baris ringkas ke console server. */
export function logPerf(route: string, entries: TimingEntry[]): void {
  const total = entries.reduce((s, e) => s + e.ms, 0);
  const parts = entries.map((e) => `${e.label}=${Math.round(e.ms)}ms`).join(' ');
  // eslint-disable-next-line no-console
  console.log(`[perf] ${route} total=${Math.round(total)}ms ${parts}`);
}
