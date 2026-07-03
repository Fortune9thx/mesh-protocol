"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToEvents } from "./api";
import { toStreamEvent } from "./eventFormat";
import type { MeshEvent, StreamEvent } from "./types";

const MAX_BUFFERED = 20;

// Subscribes to the backend's /events/stream SSE feed and keeps a rolling
// buffer of formatted StreamEvents. Falls back to an empty array if the
// backend is unreachable — callers should fall back to mock data in that case.
export function useLiveEvents() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [raw, setRaw] = useState<MeshEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = subscribeToEvents((msg) => {
      if ("type" in msg && msg.type === "connected") {
        setConnected(true);
        return;
      }
      const event = msg as MeshEvent;
      setRaw((prev) => [event, ...prev].slice(0, MAX_BUFFERED));
      setEvents((prev) => [toStreamEvent(event), ...prev].slice(0, MAX_BUFFERED));
    });

    return () => es?.close();
  }, []);

  return { events, raw, connected };
}
