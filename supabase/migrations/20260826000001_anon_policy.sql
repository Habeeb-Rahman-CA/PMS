-- Enable public access policies for single-user personal workspace
create policy "Allow public access for projects" 
    on public.projects for all 
    using (true) 
    with check (true);

create policy "Allow public access for workflows" 
    on public.workflows for all 
    using (true) 
    with check (true);

create policy "Allow public access for tasks" 
    on public.tasks for all 
    using (true) 
    with check (true);

create policy "Allow public access for tech_notes" 
    on public.tech_notes for all 
    using (true) 
    with check (true);
