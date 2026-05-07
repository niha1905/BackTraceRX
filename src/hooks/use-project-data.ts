import { useEffect, useState } from "react";
import { useSelectedProjectId } from "@/hooks/use-selected-project";

export function useProjectData() {
  const projectId = useSelectedProjectId();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = projectId === "all" ? "" : `?projectId=${encodeURIComponent(projectId)}`;
    fetch(`/api/public/demo-flow${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [projectId]);

  return { projectId, data, loading };
}
