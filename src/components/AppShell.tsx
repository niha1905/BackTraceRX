import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Activity, GitBranch, Radio, Settings, ShieldCheck, Stethoscope, Workflow } from "lucide-react";
import { ProjectSelector } from "@/components/ProjectSelector";

const nav = [
  { to: "/", label: "Dashboard", icon: Activity },
  { to: "/live", label: "Live Feed", icon: Radio },
  { to: "/journey", label: "Patient Journey", icon: Workflow },
  { to: "/insights", label: "Signal Insights", icon: ShieldCheck },
  { to: "/graph", label: "Semantic Graph", icon: GitBranch },
  { to: "/admin", label: "Admin Panel", icon: Settings },
];

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card/85 backdrop-blur-xl flex lg:flex-col">
        <div className="p-4 lg:p-6 border-r lg:border-r-0 lg:border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 rounded-xl bg-primary grid place-items-center shadow-sm">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <div className="font-display font-semibold tracking-tight text-lg leading-none">BackTraceRx</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Signal Operations</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 min-w-0 p-2 lg:p-3 flex lg:block gap-1 overflow-x-auto lg:overflow-visible">
          {nav.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block p-4 border-t border-border">
          <div className="rounded-xl bg-muted/70 p-4 border border-border">
            <div className="flex items-center gap-2 text-xs text-foreground font-semibold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-success" />
              Operational
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              4 ingestion workers · 3 NLP models · project-scoped analysis
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-16 border-b border-border bg-card/80 backdrop-blur-xl flex flex-wrap items-center px-4 lg:px-8 py-3 gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-muted px-2 py-1 font-mono">v1.4.2</span>
            <span>
              Surveillance window: <span className="font-medium text-foreground">Last 24h</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ProjectSelector />
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              <span className="text-muted-foreground">Streaming</span>
              <span className="font-mono text-signal">3.4k/min</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary grid place-items-center text-xs font-semibold text-primary-foreground shadow-sm">
              DR
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
