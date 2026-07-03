"use client";

import { useCallback, useEffect, useState } from "react";
import { getEscrows } from "./api";
import type { Escrow } from "./types";

export function useDisputedEscrows() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const all = await getEscrows();
    setEscrows((all ?? []).filter((e) => e.status === "disputed"));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { escrows, loading, refetch };
}
