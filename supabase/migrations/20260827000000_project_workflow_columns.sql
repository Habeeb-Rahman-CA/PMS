-- Add customizable workflow_columns JSONB column to projects table
alter table if exists public.projects add column if not exists workflow_columns jsonb default null;
