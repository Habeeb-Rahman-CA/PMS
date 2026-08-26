-- Drop priority column from projects table
alter table if exists public.projects drop column if exists priority;

-- Drop workflows and tech_notes tables
drop table if exists public.workflows cascade;
drop table if exists public.tech_notes cascade;
