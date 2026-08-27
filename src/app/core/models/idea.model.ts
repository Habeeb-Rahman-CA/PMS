export type IdeaStatus = 'inbox' | 'converted_project' | 'converted_task' | 'archived';

export interface Idea {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  tags?: string[];
  status: IdeaStatus;
  converted_id?: string;
  created_at: string;
}
