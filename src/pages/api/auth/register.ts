import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const fullName = formData.get('full_name')?.toString();

    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Nama lengkap, email, dan password wajib diisi' }), { status: 400 });
    }

    const supabase = createAstroSupabaseClient(request, cookies);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Terjadi kesalahan sistem' }), { status: 500 });
  }
};
