import { createFileRoute } from "@tanstack/react-router";
import { detectSignals } from "@/server/analysis";
import { getStoredPosts } from "@/server/storage";

export const Route = createFileRoute("/api/public/export-report")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const format = url.searchParams.get("format") ?? "csv";
        const projectId = url.searchParams.get("projectId");
        const posts = getStoredPosts().filter((post) => !projectId || post.projectId === projectId);
        const signals = detectSignals(posts);
        if (format === "json") return Response.json({ signals, posts });

        const csv = [
          "signal,count,risk,trust,confidence,why",
          ...signals.map((signal) =>
            [
              signal.name,
              signal.count,
              signal.risk,
              signal.trust,
              signal.confidence,
              signal.why.join(" | "),
            ]
              .map((value) => `"${String(value).replaceAll('"', '""')}"`)
              .join(","),
          ),
        ].join("\n");

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=backtracerx-signals.csv",
          },
        });
      },
    },
  },
});
