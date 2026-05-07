import type { DataSource, MonitoringProject } from "@/server/projects";
import type { RawPost } from "@/server/analysis";
import { sourceSearchUrl } from "@/lib/source-links";

export interface SourceCrawler {
  source: DataSource;
  mode: "stream" | "batch";
  reliability: number;
  fetch(project: MonitoringProject): Promise<RawPost[]>;
}

const templates: Record<DataSource, string[]> = {
  X: [
    "Started {drug} last week and the dizziness is not letting up. My doctor asked me to monitor hydration.",
    "Anyone else seeing {symptom} after {drug}? Could be unrelated but timing feels odd.",
  ],
  Reddit: [
    "I took {drug} for 12 days and had severe {symptom}; ER visit last night and labs pending.",
    "Switched dose on {drug}. {symptom} got worse around day 5, then slowly improved.",
  ],
  Quora: [
    "What should I ask my clinician if {drug} seems connected to {symptom}?",
    "My relative reported {symptom} after beginning {drug}, but I only know second hand details.",
  ],
  Forum: [
    "Patient story: {drug} prescribed for chronic condition, onset of {symptom}, stopped after physician review.",
    "After starting {drug}, my name is Jane Carter and I had {symptom}; contact me at jane@example.com.",
  ],
};

const reliability: Record<DataSource, number> = {
  Reddit: 0.72,
  X: 0.62,
  Quora: 0.64,
  Forum: 0.7,
};

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function splitKeywords(project: MonitoringProject) {
  const drugs = project.keywords.filter((k) => /ozempic|wegovy|mounjaro|metformin|sertraline|gabapentin|atorvastatin/i.test(k));
  const symptoms = project.keywords.filter((k) => !drugs.includes(k));
  return {
    drug: pick(drugs.length ? drugs : project.keywords),
    symptom: pick(symptoms.length ? symptoms : ["nausea", "dizziness", "insomnia"]),
  };
}

function handleForSource(source: DataSource, project: MonitoringProject, index: number) {
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "project";
  if (source === "X") return `@${slug}_watch${index + 1}`;
  if (source === "Reddit") return `r/${slug}`;
  if (source === "Quora") return `Quora topic: ${project.name}`;
  return `Forum thread: ${project.name}`;
}

export function createMockCrawler(source: DataSource): SourceCrawler {
  return {
    source,
    mode: source === "X" ? "stream" : "batch",
    reliability: reliability[source],
    async fetch(project) {
      const count = project.latency === "real-time" ? 3 : project.latency === "daily" ? 5 : 8;
      return Array.from({ length: count }, (_, index) => {
        const words = splitKeywords(project);
        const template = pick(templates[source]);
        const text = template.replaceAll("{drug}", words.drug).replaceAll("{symptom}", words.symptom);
        const url = sourceSearchUrl(source, [words.drug, words.symptom, ...project.keywords.slice(0, 3)]);
        return {
          id: `${source.toLowerCase()}-${project.id}-${Date.now()}-${index}`,
          projectId: project.id,
          source,
          handle: handleForSource(source, project, index),
          text,
          url: url ?? undefined,
          ts: Date.now() - index * 90000,
          authorAgeDays: 90 + index * 22,
          engagement: 4 + index,
        };
      });
    },
  };
}

export const crawlerRegistry = {
  X: createMockCrawler("X"),
  Reddit: createMockCrawler("Reddit"),
  Quora: createMockCrawler("Quora"),
  Forum: createMockCrawler("Forum"),
} satisfies Record<DataSource, SourceCrawler>;

export async function crawlProject(project: MonitoringProject) {
  const selected = project.sources.map((source) => crawlerRegistry[source]);
  const raw = (await Promise.all(selected.map((crawler) => crawler.fetch(project)))).flat();
  return raw;
}
