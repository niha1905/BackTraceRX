import { processRawPost } from "@/server/analysis";
import { crawlProject } from "@/server/crawlers";
import type { MonitoringProject } from "@/server/projects";

export async function runProjectCrawlers(projects: MonitoringProject[]) {
  const activeProjects = projects.filter((project) => project.enabled);
  const keywordMap = new Map(activeProjects.map((project) => [project.id, project.keywords]));
  const raw = (await Promise.all(activeProjects.map((project) => crawlProject(project)))).flat();
  const processed = raw
    .map((post) => processRawPost(post, keywordMap.get(post.projectId ?? "") ?? []))
    .filter((post) => post !== null);

  return { raw, processed };
}
