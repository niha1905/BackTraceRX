import type { ProcessedPost } from "@/server/analysis";

export interface GraphNode {
  id: string;
  label: string;
  type: "post" | "drug" | "symptom" | "condition";
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  reason: "shared entity" | "semantic similarity" | "time proximity";
}

export function buildSemanticGraph(posts: ProcessedPost[]) {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const post of posts) {
    nodes.set(post.id, { id: post.id, label: post.handle, type: "post", size: 6 });
    const entities = [
      { id: `drug:${post.drug}`, label: post.drug, type: "drug" as const },
      ...(post.symptom === "general" ? [] : [{ id: `symptom:${post.symptom}`, label: post.symptom, type: "symptom" as const }]),
      ...post.entities.conditions.map((condition) => ({ id: `condition:${condition}`, label: condition, type: "condition" as const })),
    ];
    for (const entity of entities) {
      const current = nodes.get(entity.id);
      nodes.set(entity.id, { ...entity, size: current ? current.size + 1 : 12 });
      edges.push({ source: post.id, target: entity.id, weight: post.trust, reason: "shared entity" });
    }
  }

  const sorted = [...posts].sort((a, b) => a.ts - b.ts);
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.drug === b.drug || a.symptom === b.symptom) {
      edges.push({
        source: a.id,
        target: b.id,
        weight: +(1 - Math.min(0.9, Math.abs(a.ts - b.ts) / 86_400_000)).toFixed(2),
        reason: Math.abs(a.ts - b.ts) < 3_600_000 ? "time proximity" : "semantic similarity",
      });
    }
  }

  return { nodes: [...nodes.values()], edges };
}

export function reconstructJourney(posts: ProcessedPost[]) {
  const ordered = [...posts].sort((a, b) => a.ts - b.ts);
  return ordered.slice(0, 8).map((post, index) => ({
    step: index === 0 ? "Drug intake" : post.risk > 0.75 ? "Severity escalation" : post.symptom,
    date: `T+${index * 3}d`,
    summary: `${post.drug} -> ${post.symptom}`,
    confidence: +(post.trust * 0.6 + post.risk * 0.4).toFixed(2),
    evidence: post.id,
    source: post.source,
    handle: post.handle,
    url: post.url,
  }));
}
