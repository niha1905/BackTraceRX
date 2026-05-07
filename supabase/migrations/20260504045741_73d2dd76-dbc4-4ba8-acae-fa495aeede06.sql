
create table public.signal_posts (
  id text primary key,
  source text not null,
  handle text not null,
  text text not null,
  url text,
  drug text not null,
  symptom text not null,
  risk numeric not null,
  trust numeric not null,
  risk_reasons jsonb not null default '[]'::jsonb,
  trust_reasons jsonb not null default '[]'::jsonb,
  ts timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index signal_posts_ts_idx on public.signal_posts (ts desc);
create index signal_posts_risk_idx on public.signal_posts (risk desc);
create index signal_posts_trust_idx on public.signal_posts (trust desc);
create index signal_posts_source_idx on public.signal_posts (source);
create index signal_posts_drug_idx on public.signal_posts (drug);
create index signal_posts_fts_idx on public.signal_posts
  using gin (to_tsvector('english', coalesce(text,'') || ' ' || coalesce(handle,'') || ' ' || coalesce(drug,'') || ' ' || coalesce(symptom,'')));

alter table public.signal_posts enable row level security;

create policy "Public can read signal posts"
  on public.signal_posts for select
  using (true);
