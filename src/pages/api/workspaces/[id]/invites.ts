import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../../lib/supabase';
import { ensureUserProfile } from '../../../../lib/auth-helpers';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request, cookies, url }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const workspaceId = params.id;
  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'Workspace ID required' }), { status: 400 });
  }

  await ensureUserProfile(supabase, user);

  try {
    const body = await request.json().catch(() => ({}));
    const role = body.role || 'member';
    const email = body.email ? body.email.trim().toLowerCase() : null;

    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari

    const { data: invite, error } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email: email,
        role: role,
        token: token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    const inviteLink = `${url.origin}/join/${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite,
        inviteLink,
      }),
      { status: 201 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal membuat undangan' }), { status: 500 });
  }
};
