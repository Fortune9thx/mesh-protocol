"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAllAgents, fetchAllEscrows } from "./contracts";
import type { StreamEvent } from "./types";

let _seq = 0;
function mkId() { return `ev-${++_seq}`; }
function hhmm() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Synthesises live events by diffing on-chain state snapshots.
 * No backend / SSE required -- pure contract polling.
 */
export function useLiveEvents() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const prev = useRef<{ agents: Set<string>; escrows: Map<string, string> }>({
    agents: new Set(),
    escrows: new Map(),
  });

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!active) return;
      try {
        const [agents, escrows] = await Promise.all([fetchAllAgents(), fetchAllEscrows()]);
        const newEvents: StreamEvent[] = [];

        // Detect new agent registrations
        for (const a of (agents as Array<{ agent_id: string; name: string; status: string } | null>)) {
          if (!a) continue;
          if (!prev.current.agents.has(a.agent_id)) {
            newEvents.push({
              id: mkId(),
              time: hhmm(),
              text: `${a.name} registered on Mesh (${a.status})`,
              kind: "info",
            });
          }
        }
        prev.current.agents = new Set(
          (agents as Array<{ agent_id: string } | null>)
            .filter(Boolean)
            .map((a) => (a as { agent_id: string }).agent_id),
        );

        // Detect escrow status changes
        for (const e of (escrows as Array<{ escrow_id: string; status: string; amount: number; intent_id: string } | null>)) {
          if (!e) continue;
          const prevStatus = prev.current.escrows.get(e.escrow_id);
          if (prevStatus !== e.status) {
            const kind: StreamEvent["kind"] =
              e.status === "disputed" ? "dispute" :
              e.status === "released" || e.status === "refunded" ? "settlement" : "info";
            const action =
              e.status === "locked" ? "Escrow locked" :
              e.status === "released" ? "Escrow released -- provider paid" :
              e.status === "refunded" ? "Escrow refunded -- requester made whole" :
              e.status === "disputed" ? "Dispute opened -- awaiting arbitration" :
              `Escrow ${e.status}`;
            newEvents.push({
              id: mkId(),
              time: hhmm(),
              text: `${action}: ${e.amount.toFixed(2)} GEN (${e.intent_id.slice(0, 8)})`,
              kind,
            });
          }
          prev.current.escrows.set(e.escrow_id, e.status);
        }

        if (newEvents.length > 0) {
          setEvents((existing) => [...newEvents, ...existing].slice(0, 20));
        }
      } catch {
        // silently skip failed polls
      }
    }

    // Initial poll then every 12s
    poll();
    const id = setInterval(poll, 12_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { events };
}
