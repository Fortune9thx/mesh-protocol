"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAllAgents } from "./contracts";
import type { Agent } from "./types";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllAgents();
    setAgents((data as Agent[]).filter(Boolean));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    // Poll every 15s — contract reads are fast view calls, no gas
    const id = setInterval(refetch, 15_000);
    return () => clearInterval(id);
  }, [refetch]);

  return { agents, loading, refetch };
}
