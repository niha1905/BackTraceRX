export interface PrivacyHit {
  kind: "email" | "phone" | "id" | "name";
  value: string;
  index: number;
}

const patterns: Array<[PrivacyHit["kind"], RegExp]> = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["phone", /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g],
  ["id", /\b(?:MRN|patient id|case id|nhs|ssn)[:#\s-]*[A-Z0-9-]{5,}\b/gi],
  ["name", /\b(?:my name is|i am|patient name is|this is)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g],
];

export function detectPii(text: string): PrivacyHit[] {
  const hits: PrivacyHit[] = [];
  for (const [kind, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      hits.push({ kind, value: match[0], index: match.index ?? 0 });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

export function maskPii(text: string): { text: string; hits: PrivacyHit[]; flagged: boolean } {
  const hits = detectPii(text);
  let masked = text;
  for (const hit of hits) {
    const label = `[${hit.kind.toUpperCase()} MASKED]`;
    masked = masked.replace(hit.value, label);
  }
  return { text: masked, hits, flagged: hits.length > 0 };
}
