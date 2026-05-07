import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useProjectData } from "@/hooks/use-project-data";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useProjectData();
  const signals = data?.signals ?? [];
  const processed = data?.processed ?? [];
  const hasProject = (data?.projects?.length ?? 0) > 0;
  const scopedKpis = [
    { label: "Active Signals", value: String(signals.length), delta: hasProject ? `${data.projects.length} project` : "create project", tone: "primary" as const },
    { label: "High-Risk Alerts", value: String(signals.filter((s: any) => s.risk >= 0.7).length), delta: "project-scoped", tone: "danger" as const },
    { label: "Posts Ingested", value: String(data?.rawCount ?? 0), delta: `${processed.length} processed`, tone: "primary" as const },
    { label: "Avg Trust Score", value: average(processed.map((p: any) => p.trust)).toFixed(2), delta: "privacy-filtered", tone: "success" as const },
  ];
  const scopedAlerts = signals.slice(0, 4).map((signal: any) => ({
    drug: signal.name,
    text: `${signal.count} reports - trust ${signal.trust}`,
    risk: signal.risk >= 0.7 ? "HIGH" : "MED",
  }));
  const scopedDrugSignals = rollupDrugSignals(processed);
  const scopedTrend = buildTrend(processed);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px]">
      <PageHeader
        eyebrow="Overview"
        title="Signal Surveillance Dashboard"
        description="Project-scoped pharmacovigilance intelligence aggregated from the selected keywords, sources, and latency configuration."
      />

      {!hasProject && (
        <div className="mb-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5">
          <div className="font-display text-lg font-semibold">Create a monitoring project to start</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard values remain empty until a project defines keywords, sources, and latency.
          </p>
          <a href="/admin" className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm">
            Create project
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {scopedKpis.map((k, i) => (
          <div key={k.label} className="relative overflow-hidden rounded-xl app-surface p-5 anim-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-primary/20 pointer-events-none" />
            <div className="relative">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-3xl font-display font-semibold tracking-tight">{k.value}</div>
                <div className={`text-xs font-mono flex items-center gap-1 ${k.tone === "danger" ? "text-danger" : k.tone === "success" ? "text-success" : "text-primary"}`}>
                  <TrendingUp className="h-3 w-3" />
                  {k.delta}
                </div>
              </div>
              <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${k.tone === "danger" ? "bg-danger" : k.tone === "success" ? "bg-success" : "bg-gradient-to-r from-primary to-signal"}`} style={{ width: `${processed.length ? 50 + i * 12 : 0}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 rounded-xl app-surface p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Signal Volume - 24h</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Total signals vs high-risk events for selected project scope</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Signals</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-signal" /> Risk</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={scopedTrend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.43 0.105 225)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.43 0.105 225)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.145 78)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="oklch(0.72 0.145 78)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.84 0.017 240)" />
              <XAxis dataKey="hour" stroke="oklch(0.52 0.03 245)" fontSize={10} />
              <YAxis stroke="oklch(0.52 0.03 245)" fontSize={10} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.86 0.017 240)", borderRadius: 12, fontSize: 12, boxShadow: "0 12px 30px oklch(0.36 0.04 245 / 0.12)" }} />
              <Area type="monotone" dataKey="signals" stroke="oklch(0.43 0.105 225)" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="risk" stroke="oklch(0.72 0.145 78)" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl app-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-signal" />
            <h3 className="font-display font-semibold">Critical Alerts</h3>
          </div>
          <div className="space-y-3">
            {scopedAlerts.map((a, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/55 border border-border hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-primary">{a.drug}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.risk === "HIGH" ? "bg-danger/20 text-danger" : "bg-signal/20 text-signal"}`}>{a.risk}</span>
                </div>
                <div className="text-xs text-muted-foreground">{a.text}</div>
              </div>
            ))}
            {scopedAlerts.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No alerts for the selected project yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl app-surface p-6">
        <h3 className="font-display font-semibold mb-4">Top Monitored Compounds</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={scopedDrugSignals} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.84 0.017 240)" horizontal={false} />
            <XAxis type="number" stroke="oklch(0.52 0.03 245)" fontSize={10} />
            <YAxis dataKey="drug" type="category" stroke="oklch(0.52 0.03 245)" fontSize={11} width={90} />
            <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.86 0.017 240)", borderRadius: 12, fontSize: 12, boxShadow: "0 12px 30px oklch(0.36 0.04 245 / 0.12)" }} />
            <Bar dataKey="reports" fill="oklch(0.43 0.105 225)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rollupDrugSignals(posts: any[]) {
  const map = new Map<string, { drug: string; reports: number; risk: number }>();
  for (const post of posts) {
    const current = map.get(post.drug) ?? { drug: post.drug, reports: 0, risk: 0 };
    current.reports += 1;
    current.risk += post.risk;
    map.set(post.drug, current);
  }
  return [...map.values()]
    .map((item) => ({ ...item, risk: item.risk / Math.max(1, item.reports) }))
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 8);
}

function buildTrend(posts: any[]) {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, index) => {
    const hourStart = now - (23 - index) * 60 * 60 * 1000;
    const hourEnd = hourStart + 60 * 60 * 1000;
    const bucket = posts.filter((post) => post.ts >= hourStart && post.ts < hourEnd);
    return {
      hour: new Date(hourStart).getHours().toString().padStart(2, "0"),
      signals: bucket.length,
      risk: bucket.filter((post) => post.risk >= 0.7).length,
    };
  });
}
