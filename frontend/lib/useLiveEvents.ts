"use client";

import { useChainState } from "./chainStore";

export function useLiveEvents() {
  const { events } = useChainState();
  return { events };
}
