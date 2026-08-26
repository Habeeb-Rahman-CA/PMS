-- DevFlow Personal Project Manager - Supabase PostgreSQL Schema

-- 1. Projects Table
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    slug text not null,
    description text,
    repository_url text,
    status text not null default 'active', -- active, archived, completed
    labels text[] default '{}',
    color text default '#06b6d4',
    workflow_columns jsonb default null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tasks Table (Stories, Bugs, Tasks, Epics)
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade,
    title text not null,
    description text,
    type text not null default 'task', -- task, bug, story, epic
    status text not null default 'todo', -- backlog, todo, in_progress, in_review, done, or custom status
    priority text not null default 'medium', -- low, medium, high, urgent
    labels text[] default '{}',
    assignee text default 'Self',
    due_date date,
    position integer not null default 0,
    is_next bool default false,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Task Comments Table
create table if not exists public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid references public.tasks(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade,
    author_name text not null default 'Developer',
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

-- Row Level Security Policies
create policy "Allow public access for projects" 
    on public.projects for all 
    using (true) 
    with check (true);

create policy "Allow public access for tasks" 
    on public.tasks for all 
    using (true) 
    with check (true);

create policy "Allow public access for task_comments" 
    on public.task_comments for all 
    using (true) 
    with check (true);
