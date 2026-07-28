"use client";

// Single shared poller for all on-chain state. Every hook (useAgents,
// useDisputedEscrows, useLiveEvents) reads from this store, so no matter how
// many components mount, the RPC sees exactly one fetch cycle per interval.
// This keeps us under Bradbury's gen_call rate limit.

import { useSyncExternalStore } from "react";
import { fetchAllAgents, fetchAllEscrows } from "./contracts";
import type { Agent, Escrow, StreamEvent } from "./types";

const POLL_MS = 20_000;

export type ChainState = {
  agents: Agent[];
  escrows: Escrow[];
  events: StreamEvent[];
  loading: boolean;
};

let state: ChainState = { agents: [], escrows: [], events: [], loading: true };

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;
let inFlight = false;

let _seq = 0;
const mkId = () => `ev-${++_seq}`;
const hhmm = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const prev = {
  seeded: false,
  agents: new Set<string>(),
  escrows: new Map<string, string>(),
};

function emit() {
  for (const l of listeners) l();
}

function diffEvents(agents: Agent[], escrows: Escrow[]): StreamEvent[] {
  const out: StreamEvent[] = [];

  if (prev.seeded) {
    for (const a of agents) {
      if (!prev.agents.has(a.agent_id)) {
        out.push({
          id: mkId(),
          time: hhmm(),
          text: `${a.name} registered on Mesh (${a.status})`,
          kind: "info",
        });
      }
    }
    for (const e of escrows) {
      const was = prev.escrows.get(e.escrow_id);
      if (was !== e.status) {
        const kind: StreamEvent["kind"] =
          e.status === "disputed" ? "dispute" :
          e.status === "released" || e.status === "refunded" ? "settlement" : "info";
        const action =
          e.status === "locked" ? "Escrow locked" :
          e.status === "released" ? "Escrow released -- provider paid" :
          e.status === "refunded" ? "Escrow refunded -- requester made whole" :
          e.status === "disputed" ? "Dispute opened -- awaiting arbitration" :
          `Escrow ${e.status}`;
        out.push({
          id: mkId(),
          time: hhmm(),
          text: `${action}: ${e.amount.toFixed(2)} GEN (${e.intent_id.slice(0, 8)})`,
          kind,
        });
      }
    }
  }

  prev.seeded = true;
  prev.agents = new Set(agents.map((a) => a.agent_id));
  prev.escrows = new Map(escrows.map((e) => [e.escrow_id, e.status]));
  return out;
}

export async function refetchChain(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const [agentsRaw, escrowsRaw] = await Promise.all([
      fetchAllAgents(),
      fetchAllEscrows(),
    ]);
    const agents = (agentsRaw as Agent[]).filter(Boolean);
    const escrows = (escrowsRaw as Escrow[]).filter(Boolean);
    const fresh = diffEvents(agents, escrows);
    state = {
      agents,
      escrows,
      events: fresh.length > 0 ? [...fresh, ...state.events].slice(0, 20) : state.events,
      loading: false,
    };
    emit();
  } catch {
    // Rate-limited or transient RPC failure — keep the last good snapshot.
    if (state.loading) {
      state = { ...state, loading: false };
      emit();
    }
  } finally {
    inFlight = false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (++refCount === 1) {
    refetchChain();
    timer = setInterval(refetchChain, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (--refCount === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => state;

export function useChainState(): ChainState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
