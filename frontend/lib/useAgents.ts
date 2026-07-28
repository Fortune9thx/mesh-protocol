"use client";

import { useChainState, refetchChain } from "./chainStore";

export function useAgents() {
  const { agents, loading } = useChainState();
  return { agents, loading, refetch: refetchChain };
}
