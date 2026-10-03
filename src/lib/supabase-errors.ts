/** Helper terpusat untuk mendeteksi error PostgREST/Supabase umum. */

/**
 * True jika error berarti tabel belum ada / belum masuk schema cache PostgREST.
 * Contoh pesan: "Could not find the table 'public.workspace_materials' in the schema cache"
 * Kode PostgREST umum: PGRST205. Kode Postgres umum: 42P01 (undefined_table).
 */
export function isMissingTableError(error: any, tableName?: string): boolean {
  if (!error) return false;
  const code = (error.code ?? '').toString().toUpperCase();
  if (code === 'PGRST205' || code === '42P01') return true;

  const haystack = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  const mentionsTable = tableName ? haystack.includes(tableName.toLowerCase()) : true;
  if (haystack.includes('could not find the table') && mentionsTable) return true;
  if (haystack.includes('schema cache') && mentionsTable) return true;
  if (haystack.includes('does not exist') && mentionsTable) return true;
  return false;
}

export function isMissingMaterialsTableError(error: any): boolean {
  return isMissingTableError(error, 'workspace_materials');
}

/**
 * Respon ramah saat tabel materi belum dimigrasi — jauh lebih jelas
 * daripada pesan mentah "Could not find the table ... in the schema cache".
 */
export function missingMaterialsTableResponse(): Response {
  return new Response(
    JSON.stringify({
      error:
        'Tabel materi (public.workspace_materials) belum tersedia di database. ' +
        'Buka Supabase Dashboard > SQL Editor > jalankan file supabase/workspace-materials.sql, ' +
        "lalu jalankan NOTIFY pgrst, 'reload schema'; dan coba lagi.",
      code: 'MATERIALS_TABLE_MISSING',
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}
