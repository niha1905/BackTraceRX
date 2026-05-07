import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Activity, Bot, CheckCircle2, Database, Download, Plus, Save, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { notifyProjectsChanged, setStoredProjectId } from "@/hooks/use-selected-project";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

type Source = "X" | "Reddit" | "Quora" | "Forum";
type Latency = "real-time" | "daily" | "weekly";

interface Project {
  id?: string;
  name: string;
  keywords: string[];
  sources: Source[];
  latency: Latency;
  enabled?: boolean;
  updatedAt?: string;
}

const sources: Source[] = ["X", "Reddit", "Quora", "Forum"];
const emptyProject: Project = {
  name: "",
  keywords: [],
  sources: [],
  latency: "real-time",
  enabled: true,
};

function Admin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string>("new");
  const [draft, setDraft] = useState<Project>(emptyProject);
  const [keyword, setKeyword] = useState("");
  const [pipeline, setPipeline] = useState<any>(null);
  const [chatQuestion, setChatQuestion] = useState("Why was the highest risk signal flagged?");
  const [chatAnswer, setChatAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId), [projects, selectedId]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selected) setDraft(selected);
    if (selectedId === "new") setDraft(emptyProject);
  }, [selected, selectedId]);

  async function fetchProjects() {
    const res = await fetch("/api/public/projects");
    const data = await res.json();
    setProjects(data.projects ?? []);
  }

  async function saveProject() {
    setSaving(true);
    const method = draft.id ? "PUT" : "POST";
    const res = await fetch("/api/public/projects", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    await fetchProjects();
    if (data.project?.id) {
      setSelectedId(data.project.id);
      setStoredProjectId(data.project.id);
      notifyProjectsChanged();
    }
    setSaving(false);
  }

  async function deleteSelected() {
    if (!draft.id) return;
    await fetch(`/api/public/projects?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" });
    setSelectedId("new");
    setStoredProjectId("all");
    await fetchProjects();
    notifyProjectsChanged();
  }

  async function runProjectPipeline() {
    if (!draft.id) return;
    const res = await fetch(`/api/public/demo-flow?projectId=${encodeURIComponent(draft.id)}`);
    const data = await res.json();
    setPipeline(data);
  }

  async function askChatbot() {
    const res = await fetch("/api/public/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: chatQuestion, projectId: draft.id }),
    });
    const data = await res.json();
    setChatAnswer(data.answer);
  }

  function toggleSource(source: Source) {
    setDraft((current) => {
      const has = current.sources.includes(source);
      const next = has ? current.sources.filter((item) => item !== source) : [...current.sources, source];
      return { ...current, sources: next };
    });
  }

  function addKeyword() {
    const value = keyword.trim();
    if (!value || draft.keywords.includes(value)) return;
    setDraft((current) => ({ ...current, keywords: [...current.keywords, value] }));
    setKeyword("");
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1600px]">
      <PageHeader
        eyebrow="Control Plane"
        title={projects.length === 0 ? "Create Your First Monitoring Project" : "Project Management and Platform Operations"}
        description="Configure the project first. All ingestion, privacy filtering, signal scoring, journey reconstruction, graph relationships, exports, and insight querying use the selected project."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
        <aside className="rounded-xl app-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Projects</h3>
            <button
              onClick={() => setSelectedId("new")}
              className="h-8 w-8 rounded-lg border border-border bg-card grid place-items-center hover:border-primary hover:text-primary transition-colors"
              title="Create project"
              aria-label="Create project"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <ProjectButton active={selectedId === "new"} project={{ ...emptyProject, name: "Create project" }} onClick={() => setSelectedId("new")} />
            {projects.map((project) => (
              <ProjectButton
                key={project.id}
                active={selectedId === project.id}
                project={project}
                onClick={() => setSelectedId(project.id ?? "new")}
              />
            ))}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-xl app-surface p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Project name</label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 bg-card"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Latency</label>
                <div className="mt-2 grid grid-cols-3 rounded-lg border border-border overflow-hidden bg-muted/50 p-1">
                  {(["real-time", "daily", "weekly"] as Latency[]).map((latency) => (
                    <button
                      key={latency}
                      onClick={() => setDraft((current) => ({ ...current, latency }))}
                      className={`h-9 rounded-md text-sm capitalize transition-colors ${draft.latency === latency ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                    >
                      {latency}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Sources</label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {sources.map((source) => {
                    const active = draft.sources.includes(source);
                    return (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={`h-10 rounded-lg border text-sm transition-colors ${active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Keywords</label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addKeyword();
                    }}
                    placeholder="Drug, symptom, condition"
                    className="bg-card"
                  />
                  <button
                    onClick={addKeyword}
                    className="h-10 w-10 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm"
                    title="Add keyword"
                    aria-label="Add keyword"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.keywords.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs">
                      {item}
                      <button
                        onClick={() => setDraft((current) => ({ ...current, keywords: current.keywords.filter((k) => k !== item) }))}
                        aria-label={`Remove ${item}`}
                        title={`Remove ${item}`}
                        className="text-muted-foreground hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={saveProject}
                disabled={saving || !draft.name.trim() || draft.keywords.length === 0 || draft.sources.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving" : "Save project"}
              </button>
              {draft.id && (
                <button
                  onClick={deleteSelected}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 text-sm font-medium text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <OperationCard
              icon={<Activity className="h-4 w-4 text-signal" />}
              title="Project Pipeline"
              body="Runs only this project's selected crawlers, privacy masking, NLP extraction, trust scoring, signal detection, journey reconstruction, and graph generation."
              action={<button disabled={!draft.id} onClick={runProjectPipeline} className="h-9 rounded-lg bg-signal px-3 text-sm font-medium text-signal-foreground shadow-sm disabled:opacity-50">Run</button>}
            />
            <OperationCard
              icon={<Download className="h-4 w-4 text-primary" />}
              title="Export Reports"
              body="Download the latest computed signal summary for the selected project as CSV."
              action={<a href={`/api/public/export-report?format=csv${draft.id ? `&projectId=${encodeURIComponent(draft.id)}` : ""}`} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm">CSV</a>}
            />
            <OperationCard
              icon={<Database className="h-4 w-4 text-success" />}
              title="Storage Layer"
              body="MongoDB raw, PostgreSQL structured, and Neo4j graph adapters use configured credentials or project-local memory mode."
              action={pipeline ? <span className="text-xs font-mono text-success">{pipeline.persistence?.status?.structuredPosts ?? 0} posts</span> : <span className="text-xs text-muted-foreground">Ready</span>}
            />
          </div>

          {pipeline && (
            <div className="rounded-xl app-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <h3 className="font-display font-semibold">Project Pipeline Results</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <Metric label="Raw posts" value={pipeline.rawCount} />
                <Metric label="Processed" value={pipeline.processed?.length ?? 0} />
                <Metric label="Signals" value={pipeline.signals?.length ?? 0} />
                <Metric label="Graph nodes" value={pipeline.graph?.nodes?.length ?? 0} />
                <Metric label="Graph edges" value={pipeline.graph?.edges?.length ?? 0} />
              </div>
              <div className="space-y-2">
                {(pipeline.signals ?? []).slice(0, 4).map((signal: any) => (
                  <div key={signal.id} className="rounded-lg border border-border bg-muted/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm text-primary">{signal.name}</span>
                      <span className="font-mono text-sm text-danger">risk {signal.risk}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{signal.why.join(" · ")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl app-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">Insight Chatbot</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} className="bg-card" />
              <button onClick={askChatbot} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm">Ask</button>
            </div>
            {chatAnswer && <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">{chatAnswer}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProjectButton({ project, active, onClick }: { project: Project; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${active ? "border-primary/40 bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/30 hover:bg-muted/40"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{project.name}</span>
        <span className={`h-2 w-2 rounded-full ${project.enabled === false ? "bg-muted-foreground" : "bg-success"}`} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{project.keywords.slice(0, 4).join(", ")}</div>
      <div className="mt-2 flex gap-1">
        {project.sources.map((source) => (
          <span key={source} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{source}</span>
        ))}
      </div>
    </button>
  );
}

function OperationCard({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="rounded-xl app-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display font-semibold text-sm">{title}</h3>
        </div>
        {action}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}
