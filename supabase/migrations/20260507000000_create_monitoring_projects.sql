create table if not exists public.monitoring_projects (
  id text primary key,
  name text not null,
  keywords text[] not null default '{}',
  sources text[] not null default '{}',
  latency text not null check (latency in ('real-time', 'daily', 'weekly')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monitoring_projects_updated_at_idx
  on public.monitoring_projects (updated_at desc);

alter table public.monitoring_projects enable row level security;

drop policy if exists "Public can read monitoring projects"
  on public.monitoring_projects;
create policy "Public can read monitoring projects"
  on public.monitoring_projects for select
  using (true);

drop policy if exists "Public can create monitoring projects"
  on public.monitoring_projects;
create policy "Public can create monitoring projects"
  on public.monitoring_projects for insert
  with check (true);

drop policy if exists "Public can update monitoring projects"
  on public.monitoring_projects;
create policy "Public can update monitoring projects"
  on public.monitoring_projects for update
  using (true)
  with check (true);

drop policy if exists "Public can delete monitoring projects"
  on public.monitoring_projects;
create policy "Public can delete monitoring projects"
  on public.monitoring_projects for delete
  using (true);
