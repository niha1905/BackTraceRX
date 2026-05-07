import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { runProjectCrawlers } from "@/server/pipeline";
import { getProject, listProjects } from "@/server/projects";
import type { ScoredPost } from "@/server/scoring";

let warnedAboutSignalPostPersistence = false;

function getSignalPostClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function persist(posts: ScoredPost[]) {
  if (!posts.length) return;
  const supabase = getSignalPostClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from("signal_posts").upsert(
      posts.map((p) => ({
        id: String(p.id),
        source: p.source,
        handle: p.handle,
        text: p.text,
        url: p.url ?? null,
        drug: p.drug,
        symptom: p.symptom,
        risk: p.risk,
        trust: p.trust,
        risk_reasons: p.riskReasons as never,
        trust_reasons: p.trustReasons as never,
        ts: new Date(p.ts).toISOString(),
      })),
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error && !warnedAboutSignalPostPersistence) {
      warnedAboutSignalPostPersistence = true;
      console.warn("persist signal_posts skipped. Check signal_posts table and Supabase insert/update policies.", error);
    }
  } catch (e) {
    if (!warnedAboutSignalPostPersistence) {
      warnedAboutSignalPostPersistence = true;
      console.warn("persist signal_posts skipped. Live feed still works in memory.", e);
    }
  }
}

async function resolveProjects(projectId: string) {
  const projects = projectId === "all"
    ? await listProjects()
    : [await getProject(projectId)].filter((project) => project !== null);
  return projects.filter((project) => project.latency === "real-time");
}

export const Route = createFileRoute("/api/public/live-feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const projectId = url.searchParams.get("projectId") ?? "all";
        const encoder = new TextEncoder();
        let cancelled = false;

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
              } catch {
                cancelled = true;
              }
            };

            const emitPosts = async () => {
              const projects = await resolveProjects(projectId);
              const { processed } = await runProjectCrawlers(projects);
              for (const post of processed) send("post", post);
              void persist(processed);
              send("heartbeat", { ts: Date.now(), new: processed.length, sources: projects.length });
            };

            send("hello", { ts: Date.now() });
            await emitPosts();

            const tick = async () => {
              if (cancelled) return;
              try {
                await emitPosts();
              } catch (err) {
                send("error", { message: (err as Error).message });
              }
              if (!cancelled) setTimeout(tick, 9000);
            };
            setTimeout(tick, 9000);
          },
          cancel() {
            cancelled = true;
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
