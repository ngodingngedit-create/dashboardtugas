// Helper zona waktu Asia/Jakarta (WIB, UTC+7).
// Standar stdlib Intl, jalan sama persis di Vercel (UTC) dan browser lokal.

export const JAKARTA_TZ = 'Asia/Jakarta';

/** Mengembalikan tanggal 'YYYY-MM-DD' dalam zona Asia/Jakarta. */
export function toJakartaYMD(input: Date | string | number = new Date()): string {
  const d = typeof input === 'object' && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  // en-CA menghasilkan format ISO: YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Mengembalikan tahun & bulan (1-12) saat ini di Jakarta. */
export function getJakartaCurrentYearMonth(): { year: number; month: number } {
  const ymd = toJakartaYMD(new Date());
  const [y, m] = ymd.split('-').map(Number);
  return { year: y, month: m }; // month 1-12
}

/**
 * Hitung selisih hari kalender di Jakarta: (due - today).
 * < 0 = terlewat, 0 = hari ini, 1 = besok, > 1 = akan datang.
 */
export function diffDaysJakarta(dueDateInput: string | Date): number | null {
  const dueYMD = toJakartaYMD(dueDateInput);
  if (!dueYMD) return null;
  const todayYMD = toJakartaYMD(new Date());

  const [ty, tm, td] = todayYMD.split('-').map(Number);
  const [dy, dm, dd] = dueYMD.split('-').map(Number);

  const tUtc = Date.UTC(ty, tm - 1, td);
  const dUtc = Date.UTC(dy, dm - 1, dd);

  return Math.round((dUtc - tUtc) / 86400000);
}

/** Format tanggal ramah pengguna dalam bahasa Indonesia & zona Jakarta. */
export function formatJakartaDate(
  input: string | Date,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  const d = typeof input === 'object' && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: JAKARTA_TZ }).format(d);
}

/** Format jam:menit dalam zona Jakarta. */
export function formatJakartaTime(input: string | Date): string {
  const d = typeof input === 'object' && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
