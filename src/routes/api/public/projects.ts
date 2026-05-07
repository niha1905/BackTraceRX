import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteProject, listProjects, saveProject } from "@/server/projects";
import { rememberProjects } from "@/server/storage";

const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  keywords: z.array(z.string().min(1).max(80)).min(1),
  sources: z.array(z.enum(["X", "Reddit", "Quora", "Forum"])).min(1),
  latency: z.enum(["real-time", "daily", "weekly"]),
  enabled: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/projects")({
  server: {
    handlers: {
      GET: async () => {
        const projects = await listProjects();
        rememberProjects(projects);
        return Response.json({ projects }, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        const body = await request.json();
        const parsed = ProjectSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        const project = await saveProject(parsed.data);
        rememberProjects(await listProjects());
        return Response.json({ project }, { status: 201 });
      },
      PUT: async ({ request }) => {
        const body = await request.json();
        const parsed = ProjectSchema.extend({ id: z.string().min(1) }).safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        const project = await saveProject(parsed.data);
        rememberProjects(await listProjects());
        return Response.json({ project });
      },
      DELETE: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
        const deleted = await deleteProject(id);
        rememberProjects(await listProjects());
        return Response.json({ deleted });
      },
    },
  },
});
