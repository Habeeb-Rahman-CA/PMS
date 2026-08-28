-- bilo Personal Project Manager - Supabase PostgreSQL Schema

-- 1. Projects Table
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    slug text not null,
    description text,
    repository_url text,
    status text not null default 'active',
    priority text not null default 'medium',
    labels text[] default '{}',
    color text default '#06b6d4',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Workflows / Columns Table
create table if not exists public.workflows (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    name text not null,
    position integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tasks Table
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    workflow_id uuid references public.workflows(id) on delete set null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    type text not null default 'task',
    priority text not null default 'medium',
    due_date date,
    position integer not null default 0,
    is_next bool default false,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Technical Notes Table
create table if not exists public.tech_notes (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    content text not null,
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
