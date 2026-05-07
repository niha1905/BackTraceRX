import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useProjectData } from "@/hooks/use-project-data";
import { sourceLabel } from "@/lib/source-links";
import { Pill, AlertTriangle, Activity, Siren, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/journey")({
  component: Journey,
});

const toneClasses: Record<string, string> = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  warning: "border-signal/40 bg-signal/10 text-signal",
  danger: "border-danger/40 bg-danger/10 text-danger",
  success: "border-success/40 bg-success/10 text-success",
};

function Journey() {
  const { data } = useProjectData();
  const steps = data?.journey?.length ? data.journey : [];
  const project = data?.projects?.[0];

  return (
    <div className="p-4 lg:p-8 max-w-[1400px]">
      <PageHeader
        eyebrow="BackTrace Engine"
        title="Reconstructed Patient Journey"
        description="Timeline reconstruction now uses only the selected project keywords, sources, latency mode, and processed evidence."
      />

      <div className="rounded-xl app-surface p-6 mb-6">
        <div className="flex flex-wrap gap-6 text-sm">
          <Meta label="Project" value={project?.name ?? "No project selected"} />
          <Meta label="Keywords" value={project?.keywords?.slice(0, 4).join(", ") ?? "Mixed"} />
          <Meta label="Sources" value={project?.sources?.join(", ") ?? "All configured"} />
          <Meta label="Latency" value={project?.latency ?? "mixed"} />
          <Meta label="Evidence" value={String(data?.processed?.length ?? 0)} />
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-signal to-success" />
        <div className="space-y-4">
          {steps.map((s: any, i: number) => {
            const Icon = i === 0 ? Pill : s.step === "Severity escalation" ? Siren : i === steps.length - 1 ? CheckCircle2 : s.confidence > 0.7 ? AlertTriangle : Activity;
            const tone = s.step === "Severity escalation" ? "danger" : i === 0 ? "primary" : i === steps.length - 1 ? "success" : "warning";
            return (
              <div key={`${s.evidence}-${i}`} className="relative pl-16 anim-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`absolute left-0 top-2 h-12 w-12 rounded-full border-2 grid place-items-center bg-card ${toneClasses[tone]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="rounded-xl app-surface p-5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{s.date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${toneClasses[tone]}`}>{s.step}</span>
                  </div>
                  <div className="font-display text-lg font-semibold">{s.summary}</div>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary hover:underline" title={sourceLabel(s.source)}>
                      {sourceLabel(s.source)}
                    </a>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Evidence {s.evidence} · confidence {Number(s.confidence).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
          {steps.length === 0 && (
            <div className="ml-16 rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
              No project evidence has produced a journey yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold text-foreground">{value}</div>
    </div>
  );
}

