import { buildPost, relTime, scoreRiskWithReasons, scoreTrustWithReasons, type ScoredPost } from "@/server/scoring";
import { maskPii, type PrivacyHit } from "@/server/privacy";

export interface RawPost {
  id: string;
  projectId?: string;
  source: string;
  handle: string;
  text: string;
  url?: string;
  ts?: number;
  authorAgeDays?: number;
  engagement?: number;
}

export interface ProcessedPost extends ScoredPost {
  projectId?: string;
  entities: {
    drugs: string[];
    symptoms: string[];
    conditions: string[];
  };
  sentiment: "positive" | "negative" | "neutral";
  certainty: "first-hand" | "speculative" | "reported";
  privacy: {
    flagged: boolean;
    hits: PrivacyHit[];
  };
}

const conditionTerms = ["diabetes", "depression", "chronic pain", "hypertension", "obesity", "migraine"];

export function detectSentiment(text: string): ProcessedPost["sentiment"] {
  const lower = text.toLowerCase();
  const negative = ["severe", "worse", "terrible", "unbearable", "er", "hospital", "pain", "nausea", "rash"];
  const positive = ["better", "resolved", "improved", "helped", "subsiding", "stable"];
  const neg = negative.filter((term) => lower.includes(term)).length;
  const pos = positive.filter((term) => lower.includes(term)).length;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

export function detectCertainty(text: string): ProcessedPost["certainty"] {
  const lower = text.toLowerCase();
  if (/\b(i|my|me)\b/.test(lower) && /\b(started|took|prescribed|switched|stopped)\b/.test(lower)) return "first-hand";
  if (/\bmaybe|could be|might|anyone else|wondering|heard\b/.test(lower)) return "speculative";
  return "reported";
}

export function processRawPost(raw: RawPost, projectKeywords: string[] = []): ProcessedPost | null {
  const privacy = maskPii(raw.text);
  const scored = buildPost({ ...raw, text: privacy.text }) ?? buildKeywordPost(raw, privacy.text, projectKeywords);
  if (!scored) return null;
  const lower = privacy.text.toLowerCase();
  const entities = {
    drugs: [scored.drug],
    symptoms: scored.symptom === "general" ? [] : [scored.symptom],
    conditions: conditionTerms.filter((term) => lower.includes(term)),
  };
  const certainty = detectCertainty(privacy.text);
  const certaintyBoost = certainty === "first-hand" ? 0.06 : certainty === "speculative" ? -0.08 : 0;
  return {
    ...scored,
    projectId: raw.projectId,
    trust: Math.max(0.1, Math.min(0.98, +(scored.trust + certaintyBoost).toFixed(2))),
    trustReasons: [
      ...scored.trustReasons,
      {
        label: `Language certainty: ${certainty}`,
        delta: certaintyBoost,
        kind: certaintyBoost >= 0 ? "positive" : "negative",
      },
    ],
    entities,
    sentiment: detectSentiment(privacy.text),
    certainty,
    privacy: { flagged: privacy.flagged, hits: privacy.hits },
  };
}

function buildKeywordPost(raw: RawPost, text: string, projectKeywords: string[]): ScoredPost | null {
  const matched = projectKeywords.find((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
  if (!matched) return null;
  const ts = raw.ts ?? Date.now();
  const otherKeyword = projectKeywords.find((keyword) => keyword !== matched && text.toLowerCase().includes(keyword.toLowerCase()));
  const risk = scoreRiskWithReasons(text);
  const trust = scoreTrustWithReasons(text, raw.source);
  return {
    id: raw.id,
    source: raw.source,
    handle: raw.handle,
    text: text.length > 400 ? `${text.slice(0, 397)}...` : text,
    url: raw.url,
    drug: matched,
    symptom: otherKeyword ?? "keyword",
    risk: risk.score,
    trust: trust.score,
    time: relTime(ts),
    ts,
    riskReasons: risk.reasons,
    trustReasons: trust.reasons,
  };
}

export function detectSignals(posts: ProcessedPost[]) {
  const grouped = new Map<string, ProcessedPost[]>();
  for (const post of posts) {
    const key = `${post.drug} -> ${post.symptom}`;
    grouped.set(key, [...(grouped.get(key) ?? []), post]);
  }
  return [...grouped.entries()]
    .map(([name, items]) => {
      const avgRisk = items.reduce((sum, p) => sum + p.risk, 0) / items.length;
      const avgTrust = items.reduce((sum, p) => sum + p.trust, 0) / items.length;
      const firstHand = items.filter((p) => p.certainty === "first-hand").length;
      const severity = items.filter((p) => p.symptom === "severe" || p.risk > 0.7).length;
      const score = Math.min(0.99, avgRisk * 0.48 + avgTrust * 0.32 + Math.min(0.2, items.length / 30) + severity * 0.02);
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        count: items.length,
        risk: +score.toFixed(2),
        trust: +avgTrust.toFixed(2),
        confidence: +(avgTrust * 0.55 + (firstHand / Math.max(1, items.length)) * 0.35 + 0.1).toFixed(2),
        why: [
          `${items.length} supporting posts across ${new Set(items.map((p) => p.source)).size} sources`,
          `${firstHand} first-hand narratives detected`,
          `Average trust ${avgTrust.toFixed(2)} with privacy filtering applied`,
        ],
        supportingPostIds: items.slice(0, 5).map((p) => p.id),
        supportingPosts: items.slice(0, 5).map((p) => ({
          id: p.id,
          source: p.source,
          handle: p.handle,
          url: p.url,
          text: p.text,
          risk: p.risk,
          trust: p.trust,
        })),
      };
    })
    .sort((a, b) => b.risk - a.risk);
}
