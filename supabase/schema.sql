-- DevFlow Personal Project Manager - Supabase PostgreSQL Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Projects Table
create table public.projects (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    slug text not null,
    description text,
    repository_url text,
    status text not null default 'active', -- active, archived, completed
    color text default '#3b82f6',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Workflows / Columns Table
create table public.workflows (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid references public.projects(id) on delete cascade not null,
    name text not null, -- e.g. Backlog, In Progress, In Review, Done
    position integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tasks Table (Stories, Bugs, Tasks)
create table public.tasks (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid references public.projects(id) on delete cascade not null,
    workflow_id uuid references public.workflows(id) on delete set null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    type text not null default 'task', -- task, bug, story, note
    priority text not null default 'medium', -- low, medium, high, urgent
    due_date date,
    position integer not null default 0,
    is_next bool default false, -- Marks task for "What to work on next" focus list
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Technical Notes Table
create table public.tech_notes (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    content text not null, -- Markdown content
    tags text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.workflows enable row level security;
alter table public.tasks enable row level security;
alter table public.tech_notes enable row level security;

-- Row Level Security Policies (Personal-first isolation)
create policy "Users can manage their own projects" 
    on public.projects for all 
    using (auth.uid() = user_id) 
    with check (auth.uid() = user_id);

create policy "Users can manage workflows of their projects" 
    on public.workflows for all 
    using (project_id in (select id from public.projects where user_id = auth.uid()));

create policy "Users can manage their own tasks" 
    on public.tasks for all 
    using (auth.uid() = user_id) 
    with check (auth.uid() = user_id);

create policy "Users can manage their technical notes" 
    on public.tech_notes for all 
    using (auth.uid() = user_id) 
    with check (auth.uid() = user_id);
