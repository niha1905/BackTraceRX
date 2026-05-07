import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useSelectedProjectId } from "@/hooks/use-selected-project";
import { sourceLabel } from "@/lib/source-links";
import { Radio, MessageSquare, Wifi, WifiOff, ChevronDown, Search, X, Info, ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/live")({
  component: LiveFeed,
});

interface ScoreReason {
  label: string;
  delta: number;
  kind: "positive" | "negative" | "base";
}

interface FeedPost {
  id: string | number;
  source: string;
  handle: string;
  text: string;
  url?: string;
  drug: string;
  symptom: string;
  risk: number;
  trust: number;
  time: string;
  ts?: number;
  riskReasons?: ScoreReason[];
  trustReasons?: ScoreReason[];
}

type SortKey = "recent" | "risk" | "trust" | "relevance";
type Order = "asc" | "desc";

function LiveFeed() {
  const projectId = useSelectedProjectId();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [stats, setStats] = useState({ rate: 0, lastBeat: Date.now() });
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [minRisk, setMinRisk] = useState(0);
  const [minTrust, setMinTrust] = useState(0);
  const [sort, setSort] = useState<SortKey>("recent");
  const [order, setOrder] = useState<Order>("desc");
  const [searchMode, setSearchMode] = useState<"live" | "indexed">("live");
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const esRef = useRef<EventSource | null>(null);

  // Live SSE stream
  useEffect(() => {
    if (searchMode !== "live") return;
    const params = projectId === "all" ? "" : `?projectId=${encodeURIComponent(projectId)}`;
    const es = new EventSource(`/api/public/live-feed${params}`);
    esRef.current = es;

    es.addEventListener("hello", () => setStatus("live"));
    es.addEventListener("post", (e) => {
      const p = JSON.parse((e as MessageEvent).data) as FeedPost;
      setPosts((prev) => {
        if (prev.some((x) => String(x.id) === String(p.id))) return prev;
        return [p, ...prev].slice(0, 60);
      });
    });
    es.addEventListener("heartbeat", (e) => {
      const d = JSON.parse((e as MessageEvent).data) as { new: number };
      setStats(() => ({ rate: d.new, lastBeat: Date.now() }));
      setPosts((prev) =>
        prev.map((p) => ({
          ...p,
          risk: Math.max(0.05, Math.min(0.99, +(p.risk + (Math.random() - 0.5) * 0.04).toFixed(2))),
          trust: Math.max(0.1, Math.min(0.98, +(p.trust + (Math.random() - 0.5) * 0.02).toFixed(2))),
        })),
      );
    });
    es.onerror = () => setStatus("offline");

    return () => es.close();
  }, [searchMode, projectId]);

  // Indexed search against backend
  useEffect(() => {
    if (searchMode !== "indexed") return;
    const ctrl = new AbortController();
    setSearching(true);
    const params = new URLSearchParams({
      q: query,
      projectId,
      source: sourceFilter,
      minRisk: String(minRisk),
      minTrust: String(minTrust),
      sort,
      order,
      limit: "60",
    });
    const t = setTimeout(() => {
      fetch(`/api/public/search-posts?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { posts: FeedPost[]; total: number }) => {
          setPosts(d.posts);
          setTotal(d.total);
          setStatus("live");
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [searchMode, query, sourceFilter, minRisk, minTrust, sort, order, projectId]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    posts.forEach((p) => s.add(p.source));
    return Array.from(s);
  }, [posts]);

  const filtered = useMemo(() => {
    if (searchMode === "indexed") {
      // Sorting/filtering already done server-side.
      return posts;
    }
    const q = query.trim().toLowerCase();
    const list = posts.filter((p) => {
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      if (p.risk < minRisk) return false;
      if (p.trust < minTrust) return false;
      if (!q) return true;
      return (
        p.text.toLowerCase().includes(q) ||
        p.drug.toLowerCase().includes(q) ||
        p.symptom.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q)
      );
    });
    const cmp = (a: FeedPost, b: FeedPost) => {
      const dir = order === "asc" ? 1 : -1;
      if (sort === "risk") return (a.risk - b.risk) * dir;
      if (sort === "trust") return (a.trust - b.trust) * dir;
      if (sort === "relevance") return (b.risk + b.trust - a.risk - a.trust);
      return ((a.ts ?? 0) - (b.ts ?? 0)) * dir;
    };
    return [...list].sort(cmp);
  }, [posts, query, sourceFilter, minRisk, minTrust, sort, order, searchMode]);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px]">
      <PageHeader
        eyebrow="Real-Time Stream"
        title="Live Signal Feed"
        description="Continuous ingestion from Reddit and the open web via Firecrawl — annotated with extracted drugs, symptoms, and explainable risk/trust scores."
      />

      <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl app-surface flex-wrap">
        {status === "live" ? (
          <Radio className="h-4 w-4 text-signal pulse-dot" />
        ) : status === "offline" ? (
          <WifiOff className="h-4 w-4 text-danger" />
        ) : (
          <Wifi className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm capitalize">
          {searchMode === "indexed"
            ? searching ? "Querying index…" : "Indexed search"
            : status === "live" ? "SSE stream active" : status}
        </span>
        <div className="ml-2 inline-flex rounded-md border border-border overflow-hidden text-xs">
          <button
            onClick={() => setSearchMode("live")}
            className={`px-2.5 py-1 ${searchMode === "live" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >Live</button>
          <button
            onClick={() => setSearchMode("indexed")}
            className={`px-2.5 py-1 ${searchMode === "indexed" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >Indexed</button>
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length}{searchMode === "indexed" && total != null ? `/${total}` : `/${posts.length}`} posts
          {searchMode === "live" && ` · ${stats.rate} new last cycle`}
        </span>
      </div>

      {/* Search engine */}
      <div className="mb-6 rounded-xl app-surface p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drug, symptom, handle, text…"
            className="pl-9 pr-9 h-9 bg-card"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          aria-label="Sort by"
        >
          <option value="recent">Sort: Most recent</option>
          <option value="risk">Sort: Risk score</option>
          <option value="trust">Sort: Trust score</option>
          <option value="relevance">Sort: Relevance</option>
        </select>
        <button
          onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          className="h-9 px-3 inline-flex items-center gap-1 rounded-lg border border-input bg-card text-sm hover:border-primary"
          aria-label="Toggle sort order"
          title={order === "desc" ? "Descending" : "Ascending"}
        >
          {order === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
          {order === "desc" ? "Desc" : "Asc"}
        </button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Min risk
          <input type="range" min={0} max={1} step={0.05} value={minRisk}
            onChange={(e) => setMinRisk(parseFloat(e.target.value))} className="accent-primary" />
          <span className="font-mono tabular-nums w-10 text-foreground">{minRisk.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Min trust
          <input type="range" min={0} max={1} step={0.05} value={minTrust}
            onChange={(e) => setMinTrust(parseFloat(e.target.value))} className="accent-primary" />
          <span className="font-mono tabular-nums w-10 text-foreground">{minTrust.toFixed(2)}</span>
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((p, i) => {
          const key = String(p.id);
          const open = !!expanded[key];
          return (
            <article
              key={p.id}
              className="anim-in relative rounded-xl app-surface p-5 hover:border-primary/40 transition-colors group"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="absolute left-0 top-5 bottom-5 w-1 rounded-r bg-gradient-to-b from-primary to-signal opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-mono text-primary truncate max-w-[280px]">{p.handle}</span>
                    <span className="text-muted-foreground">via {p.source}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{p.time} ago</span>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-[11px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                        title={sourceLabel(p.source)}
                      >
                        source ↗
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{p.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                      {p.drug}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                      {p.symptom}
                    </span>
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [key]: !s[key] }))}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      <Info className="h-3 w-3" />
                      Why this score?
                      <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="shrink-0 grid grid-cols-2 gap-3 text-right">
                  <Score label="Risk" value={p.risk} tone="danger" />
                  <Score label="Trust" value={p.trust} tone="primary" />
                </div>
              </div>

              {open && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 anim-in">
                  <ReasonPanel title="Risk score breakdown" tone="danger" total={p.risk} reasons={p.riskReasons} />
                  <ReasonPanel title="Trust score breakdown" tone="primary" total={p.trust} reasons={p.trustReasons} />
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-xl">
            No posts match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

function Score({ label, value, tone }: { label: string; value: number; tone: "danger" | "primary" }) {
  const color = tone === "danger" ? "text-danger" : "text-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono font-bold text-lg ${color} tabular-nums`}>{value.toFixed(2)}</div>
    </div>
  );
}

function ReasonPanel({
  title,
  tone,
  total,
  reasons,
}: {
  title: string;
  tone: "danger" | "primary";
  total: number;
  reasons?: ScoreReason[];
}) {
  const accent = tone === "danger" ? "text-danger" : "text-primary";
  const border = tone === "danger" ? "border-danger/30" : "border-primary/30";
  const items = reasons ?? [];
  return (
    <div className={`rounded-lg border ${border} bg-muted/60 p-3`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        <span className={`font-mono font-bold tabular-nums ${accent}`}>{total.toFixed(2)}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No breakdown available for this post.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((r, idx) => {
            const sign = r.delta >= 0 ? "+" : "";
            const color =
              r.kind === "negative"
                ? "text-danger"
                : r.kind === "positive"
                  ? "text-success"
                  : "text-muted-foreground";
            return (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span
                  className={`font-mono tabular-nums w-12 shrink-0 ${color}`}
                  aria-label="contribution"
                >
                  {sign}
                  {r.delta.toFixed(2)}
                </span>
                <span className="text-foreground/90 leading-snug">{r.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

