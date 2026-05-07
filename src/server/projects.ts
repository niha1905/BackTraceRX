import { createClient } from "@supabase/supabase-js";

export type DataSource = "X" | "Reddit" | "Quora" | "Forum";
export type Latency = "real-time" | "daily" | "weekly";

export interface MonitoringProject {
  id: string;
  name: string;
  keywords: string[];
  sources: DataSource[];
  latency: Latency;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

type ProjectInput = Partial<MonitoringProject> & {
  name: string;
  keywords: string[];
  sources: DataSource[];
  latency: Latency;
};

type ProjectRow = {
  id: string;
  name: string;
  keywords: string[];
  sources: DataSource[];
  latency: Latency;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

let projects: MonitoringProject[] = [];
let warnedAboutSupabase = false;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toProject(row: ProjectRow): MonitoringProject {
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    sources: row.sources,
    latency: row.latency,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(project: MonitoringProject): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    keywords: project.keywords,
    sources: project.sources,
    latency: project.latency,
    enabled: project.enabled,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function remember(projectList: MonitoringProject[]) {
  projects = projectList;
  return projects;
}

function warnSupabaseFallback(action: string, error: unknown) {
  if (warnedAboutSupabase) return;
  warnedAboutSupabase = true;
  console.error(`Project ${action} fell back to in-memory storage. Check the monitoring_projects table and Supabase policies.`, error);
}

export async function listProjects() {
  const supabase = getSupabaseClient();
  if (!supabase) return projects;

  const { data, error } = await supabase
    .from("monitoring_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    warnSupabaseFallback("list", error);
    return projects;
  }

  return remember(((data ?? []) as ProjectRow[]).map(toProject));
}

export async function getProject(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return projects.find((project) => project.id === id) ?? null;

  const { data, error } = await supabase
    .from("monitoring_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    warnSupabaseFallback("get", error);
    return projects.find((project) => project.id === id) ?? null;
  }

  return data ? toProject(data as ProjectRow) : null;
}

export async function saveProject(input: ProjectInput) {
  const now = new Date().toISOString();
  const existing = input.id ? projects.find((project) => project.id === input.id) : null;
  const project: MonitoringProject = {
    id: input.id ?? `proj-${Date.now().toString(36)}`,
    name: input.name,
    keywords: input.keywords,
    sources: input.sources,
    latency: input.latency,
    enabled: input.enabled ?? existing?.enabled ?? true,
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("monitoring_projects")
      .upsert(toRow(project), { onConflict: "id" })
      .select("*")
      .single();

    if (!error && data) {
      const saved = toProject(data as ProjectRow);
      remember([saved, ...projects.filter((item) => item.id !== saved.id)]);
      return saved;
    }

    warnSupabaseFallback("save", error);
  }

  remember([project, ...projects.filter((item) => item.id !== project.id)]);
  return project;
}

export async function deleteProject(id: string) {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("monitoring_projects").delete().eq("id", id);
    if (error) warnSupabaseFallback("delete", error);
  }

  const before = projects.length;
  remember(projects.filter((project) => project.id !== id));
  return projects.length !== before;
}
