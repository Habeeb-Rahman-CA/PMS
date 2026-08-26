export type TaskType = 'story' | 'bug' | 'task' | 'epic';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

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
  status: TaskStatus;
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
