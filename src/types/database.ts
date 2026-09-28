export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ActivityActionType =
  | 'task_created'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'comment_added'
  | 'assigned_user'
  | 'unassigned_user'

export interface Profile {
  id: string
  username: string | null
  full_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
  workspace?: Workspace
  profile?: Profile
}

export interface Tag {
  id: string
  workspace_id: string
  name: string
  color: string
  created_at: string
}

export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  estimated_hours: number | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
  tags?: Tag[]
  subtasks?: Subtask[]
  assignments?: { user: Profile }[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  completed_at: string | null
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskAssignment {
  task_id: string
  user_id: string
  assigned_by: string | null
  assigned_at: string
  user?: Profile
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  author?: Profile
}

export interface ActivityLog {
  id: string
  task_id: string
  user_id: string | null
  action: ActivityActionType
  details: Record<string, any>
  created_at: string
  actor?: Profile
}

export interface TaskAttachment {
  id: string
  task_id: string
export interface WorkspaceInvite {
  id: string
  workspace_id: string
  email: string | null
  role: WorkspaceRole
  token: string
  invited_by: string
  expires_at: string
  created_at: string
}

  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string | null
  created_at: string
  uploader?: Profile
  download_url?: string
}
