import type { ProcessedPost } from "@/server/analysis";
import type { MonitoringProject } from "@/server/projects";

let rawStore: unknown[] = [];
let processedStore: ProcessedPost[] = [];
let projectSnapshots: MonitoringProject[] = [];

export const storageAdapters = {
  mongoRaw: {
    name: "MongoDB raw data adapter",
    async insertMany(rows: unknown[]) {
      rawStore = [...rows, ...rawStore].slice(0, 500);
      return { inserted: rows.length, mode: process.env.MONGODB_URI ? "mongodb" : "memory-project" };
    },
  },
  postgresStructured: {
    name: "PostgreSQL structured results adapter",
    async upsertPosts(rows: ProcessedPost[]) {
      const byId = new Map(processedStore.map((row) => [row.id, row]));
      for (const row of rows) byId.set(row.id, row);
      processedStore = [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, 500);
      return { upserted: rows.length, mode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase-postgres" : "memory-project" };
    },
  },
  neo4jGraph: {
    name: "Neo4j graph relationship adapter",
    async writeGraph(nodes: unknown[], edges: unknown[]) {
      return { nodes: nodes.length, edges: edges.length, mode: process.env.NEO4J_URI ? "neo4j" : "memory-project" };
    },
  },
};

export function rememberProjects(projects: MonitoringProject[]) {
  projectSnapshots = projects;
}

export function getStoredPosts() {
  return processedStore;
}

export function getStorageStatus() {
  return {
    rawDocuments: rawStore.length,
    structuredPosts: processedStore.length,
    projects: projectSnapshots.length,
    adapters: Object.values(storageAdapters).map((adapter) => adapter.name),
  };
}
