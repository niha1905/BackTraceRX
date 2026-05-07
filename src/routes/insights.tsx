import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useProjectData } from "@/hooks/use-project-data";
import { sourceLabel } from "@/lib/source-links";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { ShieldCheck, Activity, Network } from "lucide-react";

export const Route = createFileRoute("/insights")({
  component: Insights,
});

function Insights() {
  const { data } = useProjectData();
  const signal = data?.signals?.[0];
  const active = {
    signal: signal?.name ?? "No signal detected",
    risk: signal?.risk ?? 0,
    trust: signal?.trust ?? 0,
    causality: signal?.confidence ?? 0,
    sources: signal?.count ?? 0,
    platforms: new Set((data?.processed ?? []).map((post: any) => post.source)).size,
    factors: [
      { name: "Cross-platform validation", score: signal ? Math.min(1, (signal.count ?? 0) / 12) : 0 },
      { name: "Source reliability", score: signal?.trust ?? 0 },
      { name: "Language certainty", score: signal?.confidence ?? 0 },
      { name: "Privacy filter", score: signal ? 1 - Math.min(0.35, ((data?.processed ?? []).filter((p: any) => p.privacy?.flagged).length / Math.max(1, data?.processed?.length ?? 1)) * 0.2) : 0 },
      { name: "Temporal coherence", score: signal ? Math.min(0.95, 0.55 + (data?.journey?.length ?? 0) * 0.06) : 0 },
    ],
    why: signal?.why ?? [],
    supportingPosts: signal?.supportingPosts ?? [],
  };
  const radar = active.factors.map((f: any) => ({ subject: f.name, A: f.score * 100 }));

  return (
    <div className="p-4 lg:p-8 max-w-[1400px]">
      <PageHeader
        eyebrow="Validation Engine"
        title="Signal Insights Panel"
        description="Trust-aware scoring and explainability are calculated from the selected project's sources, keywords, and processed evidence."
      />

      <div className="rounded-xl app-surface p-6 mb-6 relative overflow-hidden">
        <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Active Signal</div>
        <h2 className="text-2xl md:text-3xl font-display font-semibold">{active.signal}</h2>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <BigStat label="Risk Score" value={active.risk} tone="danger" />
          <BigStat label="Trust Score" value={active.trust} tone="primary" />
          <BigStat label="Causality" value={active.causality} tone="signal" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence</div>
            <div className="text-3xl font-display font-semibold mt-1">{active.sources}</div>
            <div className="text-xs text-muted-foreground">across {active.platforms} platforms</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl app-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">Trust Composition</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar}>
              <PolarGrid stroke="oklch(0.84 0.017 240)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.52 0.03 245)", fontSize: 10 }} />
              <Radar dataKey="A" stroke="oklch(0.43 0.105 225)" fill="oklch(0.43 0.105 225)" fillOpacity={0.22} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl app-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-signal" />
            <h3 className="font-display font-semibold">Explainability</h3>
          </div>
          <div className="space-y-3 text-sm">
            {active.why.map((body: string, index: number) => (
              <Explain
                key={body}
                icon={index === 0 ? <Network className="h-4 w-4 text-primary" /> : index === 1 ? <ShieldCheck className="h-4 w-4 text-success" /> : <Activity className="h-4 w-4 text-signal" />}
                title={index === 0 ? "Evidence basis" : index === 1 ? "Trust basis" : "Temporal basis"}
                body={body}
              />
            ))}
            {active.why.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Create a project and run the project pipeline to generate explainable signals.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl app-surface p-6">
        <h3 className="font-display font-semibold mb-4">Supporting Source Links</h3>
        <div className="space-y-3">
          {active.supportingPosts.map((post: any) => (
            <div key={post.id} className="rounded-lg border border-border bg-muted/60 p-3">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="font-mono text-primary">{post.handle}</span>
                <span className="text-muted-foreground">via {post.source}</span>
                {post.url && (
                  <a href={post.url} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:underline" title={sourceLabel(post.source)}>
                    {sourceLabel(post.source)}
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{post.text}</p>
            </div>
          ))}
          {active.supportingPosts.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No linked supporting posts yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: number; tone: "danger" | "primary" | "signal" }) {
  const color = tone === "danger" ? "text-danger" : tone === "signal" ? "text-signal" : "text-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-3xl font-display font-semibold mt-1 ${color}`}>{Number(value).toFixed(2)}</div>
      <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${tone === "danger" ? "bg-danger" : tone === "signal" ? "bg-signal" : "bg-primary"}`} style={{ width: `${Number(value) * 100}%` }} />
      </div>
    </div>
  );
}

function Explain({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/60 border border-border">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
