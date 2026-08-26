-- Make user_id nullable for anon/demo database inserts
alter table public.projects alter column user_id drop not null;
alter table public.tasks alter column user_id drop not null;
alter table public.tech_notes alter column user_id drop not null;
