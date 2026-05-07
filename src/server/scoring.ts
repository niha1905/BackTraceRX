// Heuristic risk/trust scoring + drug/symptom extraction.
// Pure functions, safe to import from server route handlers.

const DRUGS = [
  "ozempic", "wegovy", "mounjaro", "metformin", "atorvastatin", "lipitor",
  "sertraline", "zoloft", "lisinopril", "gabapentin", "lyrica", "pregabalin",
  "adderall", "vyvanse", "prozac", "fluoxetine", "xanax", "alprazolam",
  "tramadol", "ibuprofen", "tylenol", "acetaminophen", "warfarin", "eliquis",
  "humira", "ozempic", "rybelsus", "trulicity", "jardiance", "januvia",
  "paxlovid", "accutane", "isotretinoin", "spironolactone", "metoprolol",
];

const SYMPTOMS: Array<[string, string]> = [
  ["nausea", "GI"],
  ["vomit", "GI"],
  ["diarrhea", "GI"],
  ["constipation", "GI"],
  ["pancreatitis", "pancreatitis"],
  ["gallbladder", "gallbladder"],
  ["headache", "neurological"],
  ["dizz", "neurological"],
  ["brain zap", "neurological"],
  ["insomnia", "sleep"],
  ["tinnitus", "tinnitus"],
  ["ringing", "tinnitus"],
  ["muscle pain", "myalgia"],
  ["myalgia", "myalgia"],
  ["rash", "dermatological"],
  ["itching", "dermatological"],
  ["depress", "psychiatric"],
  ["anxiety", "psychiatric"],
  ["suicidal", "psychiatric"],
  ["hospital", "severe"],
  ["er visit", "severe"],
  ["emergency", "severe"],
  ["seizure", "severe"],
  ["death", "severe"],
];

const SEVERITY_TERMS = [
  "severe", "hospital", "er visit", "emergency", "seizure", "death",
  "suicidal", "pancreatitis", "anaphylaxis", "bleeding",
];

const SOURCE_TRUST: Record<string, number> = {
  Reddit: 0.72,
  Twitter: 0.62,
  Forum: 0.7,
  Web: 0.68,
};

export interface ScoreReason {
  label: string;
  delta: number; // signed contribution
  kind: "positive" | "negative" | "base";
}

export interface ScoredPost {
  id: string;
  source: string;
  handle: string;
  text: string;
  url?: string;
  drug: string;
  symptom: string;
  risk: number;
  trust: number;
  time: string;
  ts: number;
  riskReasons: ScoreReason[];
  trustReasons: ScoreReason[];
}

export function extractDrug(text: string): string | null {
  const lower = text.toLowerCase();
  for (const d of DRUGS) {
    if (lower.includes(d)) return d.charAt(0).toUpperCase() + d.slice(1);
  }
  return null;
}

export function extractSymptom(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [needle, label] of SYMPTOMS) {
    if (lower.includes(needle)) return label;
  }
  return null;
}

export function scoreRiskWithReasons(text: string): { score: number; reasons: ScoreReason[] } {
  const lower = text.toLowerCase();
  const reasons: ScoreReason[] = [{ label: "Baseline risk prior", delta: 0.25, kind: "base" }];
  let s = 0.25;
  for (const t of SEVERITY_TERMS) {
    if (lower.includes(t)) {
      s += 0.18;
      reasons.push({ label: `Severity term: "${t}"`, delta: 0.18, kind: "positive" });
    }
  }
  if (/\b(week|day|month)s?\b/.test(lower)) {
    s += 0.05;
    reasons.push({ label: "Temporal duration mentioned", delta: 0.05, kind: "positive" });
  }
  if (/!{2,}|wors|terrible|unbearable/.test(lower)) {
    s += 0.08;
    reasons.push({ label: "High-intensity language cue", delta: 0.08, kind: "positive" });
  }
  s += (Math.random() - 0.5) * 0.04;
  return { score: Math.max(0.05, Math.min(0.99, +s.toFixed(2))), reasons };
}

export function scoreTrustWithReasons(text: string, source: string): { score: number; reasons: ScoreReason[] } {
  const base = SOURCE_TRUST[source] ?? 0.6;
  const reasons: ScoreReason[] = [{ label: `Source reliability (${source})`, delta: base, kind: "base" }];
  let s = base;
  const len = text.length;
  if (len > 120) { s += 0.05; reasons.push({ label: "Substantive length (>120 chars)", delta: 0.05, kind: "positive" }); }
  if (len > 280) { s += 0.04; reasons.push({ label: "Detailed account (>280 chars)", delta: 0.04, kind: "positive" }); }
  if (/\b(mg|dose|prescribed|doctor|MD|diagnos)/i.test(text)) {
    s += 0.06;
    reasons.push({ label: "Clinical vocabulary present", delta: 0.06, kind: "positive" });
  }
  if (/(http|www\.)/i.test(text)) {
    s -= 0.05;
    reasons.push({ label: "Outbound link (lower confidence)", delta: -0.05, kind: "negative" });
  }
  if (/(buy|cheap|discount|coupon|click)/i.test(text)) {
    s -= 0.25;
    reasons.push({ label: "Promotional / spam cues", delta: -0.25, kind: "negative" });
  }
  s += (Math.random() - 0.5) * 0.03;
  return { score: Math.max(0.1, Math.min(0.98, +s.toFixed(2))), reasons };
}

export function scoreRisk(text: string): number { return scoreRiskWithReasons(text).score; }
export function scoreTrust(text: string, source: string): number { return scoreTrustWithReasons(text, source).score; }

export function relTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function buildPost(opts: {
  id: string;
  source: string;
  handle: string;
  text: string;
  url?: string;
  ts?: number;
}): ScoredPost | null {
  const drug = extractDrug(opts.text);
  if (!drug) return null;
  const symptom = extractSymptom(opts.text) ?? "general";
  const ts = opts.ts ?? Date.now();
  const text = opts.text.length > 400 ? opts.text.slice(0, 397) + "…" : opts.text;
  const risk = scoreRiskWithReasons(text);
  const trust = scoreTrustWithReasons(text, opts.source);
  return {
    id: opts.id,
    source: opts.source,
    handle: opts.handle,
    text,
    url: opts.url,
    drug,
    symptom,
    risk: risk.score,
    trust: trust.score,
    time: relTime(ts),
    ts,
    riskReasons: risk.reasons,
    trustReasons: trust.reasons,
  };
}
