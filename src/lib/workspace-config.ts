import type { CustomStatus, PriorityFormat, TaskPriority } from '../types/database';

export const DEFAULT_STATUSES: CustomStatus[] = [
  { key: 'todo', label: 'To Do', color: 'bg-amber-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-purple-500' },
  { key: 'done', label: 'Done', color: 'bg-emerald-500' },
];

export const PRIORITY_NUMERIC_MAP: Record<string, string> = {
  low: 'P3',
  medium: 'P2',
  high: 'P1',
  urgent: 'P0',
};

export const PRIORITY_LABEL_MAP: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function formatPriority(priority: string | TaskPriority, format: PriorityFormat = 'text'): string {
  if (format === 'numeric') {
    return PRIORITY_NUMERIC_MAP[priority] || priority;
  }
  return PRIORITY_LABEL_MAP[priority] || priority;
}
