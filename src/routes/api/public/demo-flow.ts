import { createFileRoute } from "@tanstack/react-router";
import { detectSignals } from "@/server/analysis";
import { buildSemanticGraph, reconstructJourney } from "@/server/graph-engine";
import { runProjectCrawlers } from "@/server/pipeline";
import { getProject, listProjects } from "@/server/projects";
import { getStorageStatus, storageAdapters } from "@/server/storage";

export const Route = createFileRoute("/api/public/demo-flow")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const projectId = url.searchParams.get("projectId") ?? "all";
        const projects = projectId === "all"
          ? await listProjects()
          : [await getProject(projectId)].filter((project) => project !== null);
        const { raw, processed } = await runProjectCrawlers(projects);
        const graph = buildSemanticGraph(processed);
        const signals = detectSignals(processed);
        const journey = reconstructJourney(processed);

        const rawResult = await storageAdapters.mongoRaw.insertMany(raw);
        const structuredResult = await storageAdapters.postgresStructured.upsertPosts(processed);
        const graphResult = await storageAdapters.neo4jGraph.writeGraph(graph.nodes, graph.edges);

        return Response.json(
          {
            architecture: {
              ingestion: "Pluggable crawlers per created project and selected source",
              realtime: "SSE stream in /api/public/live-feed; WebSocket-ready crawler interface",
              batch: "Daily/weekly project latency represented for cron or Celery workers",
              nlp: "Entity extraction, sentiment, certainty, privacy masking, risk/trust scoring",
              graph: "Post/entity graph compatible with NetworkX or Neo4j persistence",
              storage: ["MongoDB raw adapter", "PostgreSQL structured adapter", "Neo4j graph adapter"],
            },
            projects,
            rawCount: raw.length,
            processed,
            signals,
            journey,
            graph,
            persistence: { rawResult, structuredResult, graphResult, status: getStorageStatus() },
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
