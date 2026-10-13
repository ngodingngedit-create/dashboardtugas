export interface DueInfo {
  label: string
  tone: string
  /** selisih hari terhadap hari ini (negatif = terlewat), null jika tanpa tenggat */
  diff: number | null
}

/**
 * Menghasilkan label & warna badge untuk sebuah due_date.
 * Digunakan di halaman Home, sidebar timeline, dan halaman admin.
 */
export function dueInfo(dueDate: string | null, status: string): DueInfo {
  if (!dueDate) return { label: 'Tanpa tenggat', tone: 'bg-slate-100 text-slate-500', diff: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  const fmt = due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  if (status === 'done') return { label: fmt, tone: 'bg-emerald-50 text-emerald-600', diff }
  if (diff < 0) return { label: `Terlambat • ${fmt}`, tone: 'bg-rose-50 text-rose-600', diff }
  if (diff === 0) return { label: `Hari ini • ${fmt}`, tone: 'bg-amber-50 text-amber-700', diff }
  if (diff === 1) return { label: `Besok • ${fmt}`, tone: 'bg-blue-50 text-blue-600', diff }
  return { label: fmt, tone: 'bg-slate-100 text-slate-600', diff }
}
