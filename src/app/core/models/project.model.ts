export interface Project {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  repository_url?: string;
  status: 'active' | 'archived' | 'completed';
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  workflow_id?: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'task' | 'bug' | 'story' | 'note';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  position: number;
  is_next: boolean;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TechNote {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}
