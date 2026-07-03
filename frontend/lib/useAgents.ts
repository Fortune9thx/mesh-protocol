"use client";

import { useCallback, useEffect, useState } from "react";
import { getAgents } from "./api";
import type { Agent } from "./types";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await getAgents();
    setAgents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { agents, loading, refetch };
}
