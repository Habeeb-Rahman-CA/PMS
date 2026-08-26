-- Add status, labels, and assignee columns to tasks table if not existing
alter table if exists public.tasks add column if not exists status text not null default 'todo';
alter table if exists public.tasks add column if not exists labels text[] default '{}';
alter table if exists public.tasks add column if not exists assignee text default 'Self';

-- Create task_comments table for task detail comments & activity
create table if not exists public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid references public.tasks(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade,
    author_name text not null default 'Developer',
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and public policies
alter table public.task_comments enable row level security;

create policy "Allow public access for task_comments" 
    on public.task_comments for all 
    using (true) 
    with check (true);
