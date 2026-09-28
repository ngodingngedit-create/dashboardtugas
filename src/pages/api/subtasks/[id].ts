import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../lib/supabase';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const subtaskId = params.id;
  try {
    const { is_completed } = await request.json();
    const { data, error } = await supabase
      .from('subtasks')
      .update({ is_completed })
      .eq('id', subtaskId)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
