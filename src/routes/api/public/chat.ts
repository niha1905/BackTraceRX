import { createFileRoute } from "@tanstack/react-router";
import { detectSignals } from "@/server/analysis";
import { getStoredPosts } from "@/server/storage";

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { question?: string; projectId?: string };
        const question = body.question?.trim() || "What are the highest risk signals?";
        const posts = getStoredPosts().filter((post) => !body.projectId || post.projectId === body.projectId);
        const signals = detectSignals(posts);
        const top = signals[0];
        const answer = top
          ? `Highest current signal is ${top.name} with risk ${top.risk} and trust ${top.trust}. It was flagged because ${top.why.join("; ")}.`
          : "Create a project and run its project pipeline first so BackTraceRx can populate project-specific insights.";
        return Response.json({
          question,
          answer,
          citations: top?.supportingPostIds ?? [],
          mode: process.env.OPENAI_API_KEY ? "ai-ready" : "deterministic-project",
        });
      },
    },
  },
});
