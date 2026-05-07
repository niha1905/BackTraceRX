import { Layers3 } from "lucide-react";
import { useEffect } from "react";
import { getStoredProjectId, setStoredProjectId, useProjects, useSelectedProjectId } from "@/hooks/use-selected-project";

export function ProjectSelector() {
  const { projects } = useProjects();
  const selectedId = useSelectedProjectId();
  const selected = selectedId === "all" ? null : projects.find((project) => project.id === selectedId);

  useEffect(() => {
    if (projects.length > 0 && (selectedId === "all" || !projects.some((project) => project.id === selectedId))) {
      setStoredProjectId(projects[0].id);
    }
  }, [projects, selectedId]);

  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <Layers3 className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">Project</span>
      <select
        value={selected?.id ?? getStoredProjectId()}
        onChange={(event) => setStoredProjectId(event.target.value)}
        className="max-w-[220px] bg-transparent font-medium text-foreground outline-none"
        aria-label="Selected monitoring project"
      >
        {projects.length === 0 && <option value="all">Create a project first</option>}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
