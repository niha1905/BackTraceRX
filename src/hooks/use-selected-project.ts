import { useEffect, useState } from "react";

export const PROJECT_STORAGE_KEY = "backtracerx:selected-project";
export const PROJECT_EVENT = "backtracerx-project-change";
export const PROJECTS_EVENT = "backtracerx-projects-refresh";

export interface ProjectSummary {
  id: string;
  name: string;
  keywords: string[];
  sources: string[];
  latency: string;
  enabled: boolean;
}

export function getStoredProjectId() {
  if (typeof window === "undefined") return "all";
  return localStorage.getItem(PROJECT_STORAGE_KEY) ?? "all";
}

export function setStoredProjectId(projectId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  window.dispatchEvent(new CustomEvent(PROJECT_EVENT, { detail: projectId }));
}

export function notifyProjectsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROJECTS_EVENT));
}

export function useSelectedProjectId() {
  const [projectId, setProjectId] = useState(getStoredProjectId);

  useEffect(() => {
    const update = () => setProjectId(getStoredProjectId());
    window.addEventListener(PROJECT_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(PROJECT_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return projectId;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () => fetch("/api/public/projects")
      .then((res) => res.json())
      .then((data) => {
        if (active) setProjects(data.projects ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    load();
    window.addEventListener(PROJECTS_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(PROJECTS_EVENT, load);
    };
  }, []);

  return { projects, loading };
}
