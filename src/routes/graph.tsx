import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useProjectData } from "@/hooks/use-project-data";
import { sourceLabel } from "@/lib/source-links";

export const Route = createFileRoute("/graph")({
  component: Graph,
});

const typeColor: Record<string, string> = {
  drug: "oklch(0.43 0.105 225)",
  symptom: "oklch(0.72 0.145 78)",
  condition: "oklch(0.55 0.12 155)",
  outcome: "oklch(0.55 0.12 155)",
  post: "oklch(0.52 0.08 260)",
};

function Graph() {
  const { data } = useProjectData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scoped = data?.graph;
  const nodes = scoped?.nodes?.length ? layoutNodes(scoped.nodes) : [];
  const edges = scoped?.edges?.length ? scoped.edges : [];
  const nodeMap = Object.fromEntries(nodes.map((n: any) => [n.id, n]));
  const postMap = useMemo(
    () => new Map((data?.processed ?? []).map((post: any) => [post.id, post])),
    [data?.processed],
  );
  const selectedNode = selectedId ? nodeMap[selectedId] : null;
  const selectedConnections = selectedId
    ? edges.filter((edge: any) => edge.source === selectedId || edge.target === selectedId)
    : [];

  return (
    <div className="p-4 lg:p-8 max-w-[1600px]">
      <PageHeader
        eyebrow="Semantic Graph Layer"
        title="Knowledge Graph Visualization"
        description="Graph relationships are rebuilt from the selected project's posts, shared entities, semantic similarity, and time proximity."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div className="rounded-xl app-surface p-2 relative overflow-hidden min-h-[560px]">
          <div className="absolute inset-2 grid-bg opacity-70 rounded-lg pointer-events-none" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative w-full h-[560px]">
            <defs>
              <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="oklch(0.43 0.105 225)" />
              </marker>
              <marker id="graph-arrow-active" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 9 4.5 L 0 9 z" fill="oklch(0.72 0.145 78)" />
              </marker>
            </defs>

            {edges.map((edge: any, i: number) => {
              const source = nodeMap[edge.source];
              const target = nodeMap[edge.target];
              if (!source || !target) return null;
              const active = selectedId === edge.source || selectedId === edge.target;

              return (
                <line
                  key={`${edge.source}-${edge.target}-${i}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={active ? "oklch(0.72 0.145 78)" : "oklch(0.43 0.105 225)"}
                  strokeWidth={active ? Math.max(0.3, Number(edge.weight) * 0.6) : Math.max(0.15, Number(edge.weight) * 0.4)}
                  strokeOpacity={active ? 0.95 : Math.max(0.25, Number(edge.weight) * 0.6)}
                  vectorEffect="non-scaling-stroke"
                  markerEnd={active ? "url(#graph-arrow-active)" : "url(#graph-arrow)"}
                />
              );
            })}
          </svg>

          <div className="absolute inset-2 pointer-events-none">
            {nodes.map((node: any, i: number) => (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 anim-in"
                style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(i, 20) * 35}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className="flex flex-col items-center gap-1 group cursor-pointer pointer-events-auto text-center"
                  aria-label={`Explain ${node.label} connections`}
                >
                  <div
                    className={`rounded-full border-2 grid place-items-center transition-transform group-hover:scale-110 ${
                      selectedId === node.id ? "ring-4 ring-signal/30" : ""
                    }`}
                    style={{
                      width: node.size * 1.6,
                      height: node.size * 1.6,
                      background: `${typeColor[node.type] ?? typeColor.post}30`,
                      borderColor: typeColor[node.type] ?? typeColor.post,
                      boxShadow: `0 10px ${node.size}px ${(typeColor[node.type] ?? typeColor.post)}22`,
                    }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: node.size * 0.7,
                        height: node.size * 0.7,
                        background: typeColor[node.type] ?? typeColor.post,
                      }}
                    />
                  </div>
                  <div className="max-w-[160px] truncate text-[10px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded bg-card/90 backdrop-blur border border-border shadow-sm">
                    {node.label}
                  </div>
                </button>
              </div>
            ))}
          </div>

          {nodes.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Create and run a project to build semantic relationships.
            </div>
          )}
        </div>

        <ConnectionPanel
          node={selectedNode}
          connections={selectedConnections}
          nodeMap={nodeMap}
          postMap={postMap}
          onClose={() => setSelectedId(null)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(typeColor).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs shadow-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-muted-foreground font-mono">
          {nodes.length} nodes · {edges.length} directed edges
        </div>
      </div>
    </div>
  );
}

function ConnectionPanel({
  node,
  connections,
  nodeMap,
  postMap,
  onClose,
}: {
  node: any;
  connections: any[];
  nodeMap: Record<string, any>;
  postMap: Map<string, any>;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <aside className="rounded-xl app-surface p-6 min-h-[320px]">
        <div className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Node Explanation</div>
        <h3 className="mt-2 font-display text-xl font-semibold">Select a graph node</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Click any node to inspect its incoming and outgoing relationships, source posts, and the reason each directed edge exists.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl app-surface p-6 min-h-[560px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Node Explanation</div>
          <h3 className="mt-2 font-display text-xl font-semibold">{node.label}</h3>
          <div className="mt-2 inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs capitalize text-muted-foreground">
            {node.type} node
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg border border-border bg-card grid place-items-center text-muted-foreground hover:text-foreground"
          aria-label="Close node explanation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <PanelMetric label="Connections" value={connections.length} />
        <PanelMetric label="Weight Avg" value={average(connections.map((edge) => Number(edge.weight))).toFixed(2)} />
      </div>

      <div className="mt-5 space-y-3">
        {connections.map((edge, index) => {
          const source = nodeMap[edge.source];
          const target = nodeMap[edge.target];
          const related = edge.source === node.id ? target : source;
          const direction = edge.source === node.id ? "Outgoing" : "Incoming";
          const evidencePosts = getEvidencePosts(edge, postMap);

          return (
            <div key={`${edge.source}-${edge.target}-${index}`} className="rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-card px-2 py-0.5 font-medium text-foreground">{direction}</span>
                <span className="font-mono text-primary truncate">{source?.label ?? edge.source}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono text-primary truncate">{target?.label ?? edge.target}</span>
              </div>

              <div className="mt-3 text-sm font-medium text-foreground">
                Connected to {related?.label ?? "unknown node"}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {explainReason(edge.reason, source, target, evidencePosts)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {edge.reason}
                </span>
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  weight {Number(edge.weight).toFixed(2)}
                </span>
              </div>

              {evidencePosts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {evidencePosts.map((post: any) => (
                    <a
                      key={post.id}
                      href={post.url ?? "#"}
                      target={post.url ? "_blank" : undefined}
                      rel={post.url ? "noreferrer" : undefined}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-primary/40"
                      title={sourceLabel(post.source)}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-primary">{post.handle}</span>
                        <span className="text-muted-foreground"> via {post.source}</span>
                      </span>
                      {post.url && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {connections.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            This node has no visible relationships in the current graph window.
          </div>
        )}
      </div>
    </aside>
  );
}

function PanelMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

function getEvidencePosts(edge: any, postMap: Map<string, any>) {
  return [postMap.get(edge.source), postMap.get(edge.target)].filter(Boolean);
}

function explainReason(reason: string, source: any, target: any, posts: any[]) {
  if (reason === "shared entity") {
    const post = posts[0];
    return post
      ? `This source post mentions ${target?.label ?? "this entity"}, so the post is directed to the extracted ${target?.type ?? "entity"} node.`
      : "This edge links a post to an extracted entity because they share the same drug, symptom, or condition.";
  }

  if (reason === "time proximity") {
    return "These posts are directed in chronological order because they occurred close together and share the monitored context.";
  }

  if (reason === "semantic similarity") {
    return "These posts are directed from earlier evidence to later evidence because they mention overlapping drug or symptom concepts.";
  }

  return `This relationship was generated by the graph engine from ${source?.label ?? "the source"} to ${target?.label ?? "the target"}.`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function layoutNodes(nodes: any[]) {
  const radius = 38;
  return nodes.slice(0, 42).map((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
    const centerBias = node.type === "drug" ? 0.45 : node.type === "post" ? 1 : 0.75;
    return {
      ...node,
      x: 50 + Math.cos(angle) * radius * centerBias,
      y: 50 + Math.sin(angle) * radius * centerBias,
      size: Math.max(6, Math.min(24, node.size)),
    };
  });
}
