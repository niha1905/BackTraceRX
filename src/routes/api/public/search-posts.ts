import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Schema = z.object({
  q: z.string().max(200).optional().default(""),
  source: z.string().max(50).optional().default("all"),
  drug: z.string().max(80).optional().default("all"),
  symptom: z.string().max(80).optional().default("all"),
  projectId: z.string().max(80).optional().default("all"),
  minRisk: z.coerce.number().min(0).max(1).optional().default(0),
  minTrust: z.coerce.number().min(0).max(1).optional().default(0),
  sort: z.enum(["recent", "risk", "trust", "relevance"]).optional().default("recent"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

function getSearchClient() {
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

export const Route = createFileRoute("/api/public/search-posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = Schema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const { q, source, drug, symptom, minRisk, minTrust, sort, order, limit, offset } = parsed.data;
        const supabase = getSearchClient();

        if (!supabase) {
          return Response.json(
            { posts: [], total: 0, limit, offset, warning: "Supabase search is not configured." },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        let query = supabase
          .from("signal_posts")
          .select("*", { count: "exact" })
          .gte("risk", minRisk)
          .gte("trust", minTrust);

        if (source !== "all") query = query.eq("source", source);
        if (drug !== "all") query = query.eq("drug", drug);
        if (symptom !== "all") query = query.eq("symptom", symptom);

        if (q.trim()) {
          // Use Postgres full-text search; fall back-friendly via websearch_to_tsquery on the server side.
          // PostgREST's `textSearch` with type 'websearch' targets a column; we OR-combine across text + handle.
          const term = q.trim();
          query = query.or(
            `text.ilike.%${term.replace(/[%_]/g, "")}%,handle.ilike.%${term.replace(/[%_]/g, "")}%,drug.ilike.%${term.replace(/[%_]/g, "")}%,symptom.ilike.%${term.replace(/[%_]/g, "")}%`,
          );
        }

        const ascending = order === "asc";
        if (sort === "risk") query = query.order("risk", { ascending });
        else if (sort === "trust") query = query.order("trust", { ascending });
        else if (sort === "relevance") query = query.order("risk", { ascending: false }).order("trust", { ascending: false });
        else query = query.order("ts", { ascending });

        const { data, count, error } = await query.range(offset, offset + limit - 1);
        if (error) {
          console.error("search-posts query error", error);
          return Response.json({ error: error.message }, { status: 500 });
        }

        const posts = (data ?? []).map((r) => ({
          id: r.id,
          source: r.source,
          handle: r.handle,
          text: r.text,
          url: r.url,
          drug: r.drug,
          symptom: r.symptom,
          risk: Number(r.risk),
          trust: Number(r.trust),
          riskReasons: r.risk_reasons,
          trustReasons: r.trust_reasons,
          ts: new Date(r.ts).getTime(),
          time: relTime(new Date(r.ts).getTime()),
        }));

        return Response.json(
          { posts, total: count ?? posts.length, limit, offset },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});

function relTime(ts: number): string {
  const m = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
