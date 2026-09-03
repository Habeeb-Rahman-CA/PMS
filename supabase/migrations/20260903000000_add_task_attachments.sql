-- Add attachments array column to tasks table for storing image and attachment URLs
alter table if exists public.tasks add column if not exists attachments text[] default '{}';
