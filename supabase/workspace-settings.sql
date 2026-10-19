-- =====================================================================
-- TaskPilot: settings column per-workspace (statuses & priority format)
-- Supabase Dashboard > SQL Editor > New query > paste & Run.
-- =====================================================================

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "statuses": [
    {"key": "todo", "label": "To Do", "color": "bg-amber-500"},
    {"key": "in_progress", "label": "In Progress", "color": "bg-blue-500"},
    {"key": "review", "label": "Review", "color": "bg-purple-500"},
    {"key": "done", "label": "Done", "color": "bg-emerald-500"}
  ],
  "priority_format": "text"
}'::jsonb;
