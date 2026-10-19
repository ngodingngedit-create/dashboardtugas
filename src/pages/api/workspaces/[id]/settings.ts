import type { APIRoute } from 'astro';
import { createAstroSupabaseClient } from '../../../../lib/supabase';
import { forbiddenWorkspace, hasWorkspaceRole } from '../../../../lib/workspace-auth';
import type { WorkspaceSettings } from '../../../../types/database';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const supabase = createAstroSupabaseClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workspaceId = params.id;
  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'Workspace ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const canManage = await hasWorkspaceRole(supabase, user.id, workspaceId, ['owner', 'admin']);
  if (!canManage) {
    return new Response(JSON.stringify({ error: 'Hanya owner atau admin workspace yang dapat mengubah setting' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { statuses, priority_format } = body;

    if (statuses && !Array.isArray(statuses)) {
      return new Response(JSON.stringify({ error: 'Format status tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (priority_format && !['text', 'numeric'].includes(priority_format)) {
      return new Response(JSON.stringify({ error: 'Format priority tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ambil setting lama dulu agar merge rapi
    const { data: ws, error: fetchErr } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single();

    if (fetchErr) {
      const isMissingColumn = fetchErr.message?.toLowerCase().includes('settings') || fetchErr.code === '42703';
      const msg = isMissingColumn
        ? "Kolom 'settings' belum ada di database Supabase. Silakan jalankan script supabase/workspace-settings.sql di SQL Editor Supabase."
        : fetchErr.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentSettings: WorkspaceSettings = ws?.settings || {};
    const updatedSettings: WorkspaceSettings = {
      ...currentSettings,
      ...(statuses ? { statuses } : {}),
      ...(priority_format ? { priority_format } : {}),
    };

    const { data: updated, error } = await supabase
      .from('workspaces')
      .update({ settings: updatedSettings })
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal menyimpan pengaturan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
