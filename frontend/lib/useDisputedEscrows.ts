"use client";

import { useMemo } from "react";
import { useChainState, refetchChain } from "./chainStore";

export function useDisputedEscrows() {
  const { escrows: all, loading } = useChainState();
  const escrows = useMemo(() => all.filter((e) => e.status === "disputed"), [all]);
  return { escrows, all, loading, refetch: refetchChain };
}
