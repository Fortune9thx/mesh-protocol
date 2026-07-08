"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAllEscrows } from "./contracts";
import type { Escrow } from "./types";

export function useDisputedEscrows() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const all = await fetchAllEscrows();
    setEscrows(
      (all as Escrow[]).filter(Boolean).filter((e) => e.status === "disputed"),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, 10_000);
    return () => clearInterval(id);
  }, [refetch]);

  return { escrows, loading, refetch };
}
