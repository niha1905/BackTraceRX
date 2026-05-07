# BackTraceRx

BackTraceRx is a full-stack pharmacovigilance signal intelligence platform for monitoring patient-reported drug and symptom evidence across public sources. It lets an analyst create a monitoring project, ingest source evidence, score risk and trust, reconstruct patient journeys, and inspect source-backed semantic graph relationships.

## Why It Matters

Public patient conversations often reveal early safety signals before they appear in formal reporting pipelines. BackTraceRx turns noisy open-web evidence into an explainable monitoring workspace:

- Project-scoped drug and symptom surveillance
- Explainable risk and trust scoring
- Real-time signal feed with indexed search
- Patient journey reconstruction
- Source-backed semantic graph with directed relationship explanations
- Supabase-backed project persistence
- Exportable signal reports

## Demo Flow

1. Open the app.
2. Go to **Admin Panel**.
3. Create a monitoring project.
4. Add keywords such as `ozempic`, `nausea`, `fatigue`, or `abdominal pain`.
5. Select sources like Reddit, Forum, Quora, or X.
6. Save the project.
7. Run the **Project Pipeline**.
8. Review:
   - Dashboard KPIs
   - Live Signal Feed
   - Patient Journey
   - Signal Insights
   - Semantic Graph
9. In the Semantic Graph, click any node to see incoming and outgoing relationships, source evidence, edge weights, and why each relationship exists.

## Core Features

### Monitoring Projects

Projects define the analysis scope:

- Project name
- Keywords
- Data sources
- Latency mode: real-time, daily, or weekly
- Enabled status

All dashboards, feeds, insights, graph relationships, and exports are scoped to the selected project.

### Explainable Signal Scoring

Each processed post receives:

- **Risk score** based on severity language, temporal cues, intensity, and baseline risk
- **Trust score** based on source reliability, text quality, clinical vocabulary, link behavior, and spam indicators
- **Reason arrays** that explain why the score changed

This makes the system auditable instead of acting like a black box.

### Live Signal Feed

The Live Feed supports:

- Server-sent event streaming
- Indexed search mode
- Source filtering
- Minimum risk and trust filters
- Sort by recency, risk, trust, or relevance
- Per-post risk and trust explanations

### Patient Journey Reconstruction

Processed evidence is ordered chronologically and converted into a narrative timeline. Each step includes:

- Journey phase
- Confidence score
- Evidence ID
- Source
- Source URL when available

### Semantic Graph

The graph engine builds:

- Post nodes
- Drug nodes
- Symptom nodes
- Condition nodes
- Directed edges with arrows

Edge reasons include:

- `shared entity`
- `semantic similarity`
- `time proximity`

Clicking a node opens a detail panel explaining:

- Incoming and outgoing relationships
- Connected nodes
- Relationship direction
- Relationship reason
- Edge weight
- Supporting source posts

### Storage Layer

The app supports a pragmatic hackathon-friendly storage model:

- Supabase stores monitoring projects
- Supabase can store structured signal posts
- In-memory fallback keeps the demo usable if external credentials are missing
- Storage adapters show where MongoDB, PostgreSQL, and Neo4j can plug in for production

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript |
| Routing and full-stack app | TanStack Router, TanStack Start |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Validation | Zod |
| Database | Supabase |
| Deployment target | Cloudflare Pages / Workers, Vercel, or Netlify |

## Project Structure

```text
src/
  components/              Shared UI components
  hooks/                   Project selection and data hooks
  integrations/supabase/   Supabase clients and generated types
  lib/                     Utilities and source-link helpers
  routes/                  App pages and API routes
    api/public/            Backend API handlers
  server/                  Pipeline, crawlers, scoring, graph, storage
  styles.css               Global theme and Tailwind styles

supabase/
  migrations/              Database schema migrations
```

Important files:

```text
src/server/projects.ts          Supabase-backed project persistence
src/server/pipeline.ts          Runs project crawler and processing pipeline
src/server/crawlers.ts          Source crawler registry
src/server/analysis.ts          Post processing and signal detection
src/server/scoring.ts           Explainable risk and trust scoring
src/server/graph-engine.ts      Semantic graph and journey reconstruction
src/routes/admin.tsx            Project management and pipeline controls
src/routes/live.tsx             Live feed and indexed search UI
src/routes/graph.tsx            Interactive semantic graph UI
```

## Prerequisites

Install:

- Node.js 20 or newer
- npm
- A Supabase project

Optional:

- Cloudflare account for deployment
- Supabase CLI if you want to push migrations from the terminal

## Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Optional for privileged server-side writes
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Notes:

- `VITE_` variables are used by browser-side code.
- Non-`VITE_` variables are used by server routes.
- Keep `SUPABASE_SERVICE_ROLE_KEY` private. Do not expose it in client-side code.

## Supabase Setup

Run this SQL in the Supabase SQL Editor.

```sql
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
  on public.monitoring_projects
  for select
  using (true);

drop policy if exists "Public can create monitoring projects"
  on public.monitoring_projects;
create policy "Public can create monitoring projects"
  on public.monitoring_projects
  for insert
  with check (true);

drop policy if exists "Public can update monitoring projects"
  on public.monitoring_projects;
create policy "Public can update monitoring projects"
  on public.monitoring_projects
  for update
  using (true)
  with check (true);

drop policy if exists "Public can delete monitoring projects"
  on public.monitoring_projects;
create policy "Public can delete monitoring projects"
  on public.monitoring_projects
  for delete
  using (true);
```

If you also want structured post persistence, run:

```sql
create table if not exists public.signal_posts (
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

create index if not exists signal_posts_ts_idx on public.signal_posts (ts desc);
create index if not exists signal_posts_risk_idx on public.signal_posts (risk desc);
create index if not exists signal_posts_trust_idx on public.signal_posts (trust desc);
create index if not exists signal_posts_source_idx on public.signal_posts (source);
create index if not exists signal_posts_drug_idx on public.signal_posts (drug);

alter table public.signal_posts enable row level security;

drop policy if exists "Public can read signal posts"
  on public.signal_posts;
create policy "Public can read signal posts"
  on public.signal_posts
  for select
  using (true);

drop policy if exists "Public can create signal posts"
  on public.signal_posts;
create policy "Public can create signal posts"
  on public.signal_posts
  for insert
  with check (true);

drop policy if exists "Public can update signal posts"
  on public.signal_posts;
create policy "Public can update signal posts"
  on public.signal_posts
  for update
  using (true)
  with check (true);
```

## Install and Run

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

## Deployment

Recommended free deployment target:

- Cloudflare Workers

Other good free options:

- Vercel
- Netlify

Important: this is a full-stack app with server routes. Do not deploy only `dist/client`, because API routes like `/api/public/projects`, `/api/public/live-feed`, and `/api/public/demo-flow` need the generated Worker bundle.

### Cloudflare Workers Full-Stack Deploy

Build the app:

```bash
npm run build
```

Deploy the generated Worker:

```bash
npm run deploy
```

This runs:

```bash
npm run build && npx wrangler deploy
```

The Cloudflare Vite plugin generates the deploy config at:

```text
dist/server/wrangler.json
```

That Worker config serves both:

- Static frontend assets from `dist/client`
- Server/API functionality from `dist/server`

### First-Time Cloudflare Setup

Login to Cloudflare:

```bash
npx wrangler login
```

Set production secrets:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
```

Optional private server-side key:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

For this project, `SUPABASE_SERVICE_ROLE_KEY` is optional because project CRUD, live-feed persistence, and indexed search can use the publishable key when RLS policies are configured.

### Local Cloudflare Preview

Preview the production Worker locally:

```bash
npm run deploy:preview
```

### GitHub Deployment

For the most reliable hackathon deployment, use Cloudflare Workers deploy from your terminal after pushing to GitHub:

```bash
npm install
npm run deploy
```

If using Cloudflare dashboard builds, set the deploy command to `npx wrangler deploy` and deploy as a Workers project. A Pages/static-only deployment will not run the backend API.

For Vercel or Netlify, verify TanStack Start server functions are supported by your selected adapter before submitting.

## API Routes

| Route | Purpose |
| --- | --- |
| `/api/public/projects` | Create, list, update, and delete monitoring projects |
| `/api/public/demo-flow` | Run the project pipeline and return signals, journey, graph, and persistence status |
| `/api/public/live-feed` | Stream live processed posts using server-sent events |
| `/api/public/search-posts` | Search and filter indexed posts |
| `/api/public/export-report` | Export signal report data |
| `/api/public/chat` | Ask project-scoped insight questions |

## How The Pipeline Works

```text
Monitoring Project
  -> Source Crawlers
  -> Raw Posts
  -> Privacy Filtering
  -> Entity Extraction
  -> Risk Scoring
  -> Trust Scoring
  -> Signal Detection
  -> Journey Reconstruction
  -> Semantic Graph
  -> Dashboard, Live Feed, Insights, Export
```
## License

This project was built for hackathon demonstration and educational use.

