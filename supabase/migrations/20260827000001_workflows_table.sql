-- Create workflows table for dedicated status workflow management
create table if not exists public.workflows (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    color text default '#06b6d4',
    position integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and public policy
alter table public.workflows enable row level security;

create policy "Allow public access for workflows" 
    on public.workflows for all 
    using (true) 
    with check (true);
