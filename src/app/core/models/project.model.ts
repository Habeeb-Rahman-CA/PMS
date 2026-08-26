export type TaskType = 'story' | 'bug' | 'task' | 'epic';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkflowColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
}

export const DEFAULT_WORKFLOW_COLUMNS: WorkflowColumn[] = [
  { id: 'backlog', name: 'Backlog', position: 0, color: '#6b7280' },
  { id: 'todo', name: 'To Do', position: 1, color: '#3b82f6' },
  { id: 'in_progress', name: 'In Progress', position: 2, color: '#f59e0b' },
  { id: 'in_review', name: 'Review', position: 3, color: '#8b5cf6' },
  { id: 'done', name: 'Done', position: 4, color: '#10b981' }
];

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  slug: string;
  description?: string;
  repository_url?: string;
  status: 'active' | 'archived' | 'completed';
  labels: string[];
  color: string;
  workflow_columns?: WorkflowColumn[];
  created_at: string;
  updated_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface Task {
  id: string;
  project_id: string;
  user_id?: string;
  title: string;
  description?: string;
  type: TaskType;
  status: string; // Dynamic workflow column id (default: backlog, todo, in_progress, in_review, done)
  priority: TaskPriority;
  labels?: string[];
  assignee?: string;
  due_date?: string;
  position: number;
  is_next: boolean;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id?: string;
  author_name: string;
  content: string;
  created_at: string;
}
