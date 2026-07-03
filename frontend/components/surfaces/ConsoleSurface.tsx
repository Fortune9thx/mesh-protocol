"use client";

import { useState } from "react";
import { consoleAgentRows, globalLimits } from "@/lib/mockData";
import { AutonomyToggle } from "@/components/primitives/AutonomyToggle";
import { Button } from "@/components/primitives/Button";
import { pauseAgent } from "@/lib/api";
import type { Agent } from "@/lib/types";

interface ConsoleSurfaceProps {
  onOpenRegister: () => void;
  onOpenFund: () => void;
  agents?: Agent[];
}

interface Row {
  id: string;
  name: string;
  type: string;
  trust: number;
  spend: string;
  limit: string;
  status: "active" | "dispute" | "capped";
}

function agentToRow(agent: Agent): Row {
  return {
    id: agent.agent_id,
    name: agent.name,
    type: agent.category.toUpperCase(),
    trust: Math.round(agent.reliability_score),
    // TODO: derive 24h spend from /escrows aggregated by payee once volume matters for the demo.
    spend: "$0",
    limit: `$${agent.spending_limit.toLocaleString()}`,
    // Backend Agent has no dispute/capped concept (that's design-system flavor from
    // the reference mock) — real rows are always "active" unless paused.
    status: "active",
  };
}

const consoleTabs = ["AGENTS", "WALLETS", "PERMISSIONS", "DISPUTES"];

const statusColor = (status: string, paused: boolean) => {
  if (paused) return "#5f5f5b";
  if (status === "dispute") return "oklch(55% 0.1 30)";
  if (status === "capped") return "oklch(78% 0.07 245)";
  return "#9a9a96";
};

export function ConsoleSurface({ onOpenRegister, onOpenFund, agents = [] }: ConsoleSurfaceProps) {
  const usingRealData = agents.length > 0;
  const rows: Row[] = usingRealData
    ? agents.map(agentToRow)
    : consoleAgentRows.map((r) => ({ ...r, id: r.name }));

  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [toggleError, setToggleError] = useState<string | null>(null);

  const toggle = async (id: string) => {
    setToggleError(null);
    const wasPaused = !!paused[id];
    if (!usingRealData) {
      // Mock rows have no backing agent — local-only toggle for the demo.
      setPaused((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    if (wasPaused) {
      // No "resume" endpoint exists on the backend yet — toggle stays local for un-pausing.
      setPaused((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    const result = await pauseAgent(id);
    if (result.ok) {
      setPaused((prev) => ({ ...prev, [id]: true }));
    } else {
      setToggleError(result.error ?? "Failed to pause agent — check wallet ownership.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-obsidian">
      <div className="flex items-end justify-between px-8 pt-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#8a8a86]">PLANE 01 — HUMAN CONTROL</div>
          <div className="text-[22px] font-extrabold tracking-[-0.01em] mt-1.5">Control Console</div>
        </div>
        <Button variant="primary" onClick={onOpenRegister} className="text-[10.5px]">
          + REGISTER AGENT
        </Button>
      </div>

      <div className="flex gap-0.5 px-8 pt-5 border-b border-white/8">
        {consoleTabs.map((tab, i) => (
          <div
            key={tab}
            className="font-mono text-[10.5px] tracking-[0.1em] uppercase px-4.5 py-2.5 border-b-2 cursor-pointer"
            style={{ color: i === 0 ? "#ececea" : "#5f5f5b", borderColor: i === 0 ? "#ececea" : "transparent" }}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="flex-1 flex min-h-0 px-8 py-6 gap-6">
        {/* agents table */}
        <div className="flex-1 min-w-0">
          <div
            className="grid gap-3 px-4 pb-2.5 font-mono text-[9.5px] tracking-[0.1em] uppercase text-[#5f5f5b] border-b border-white/10"
            style={{ gridTemplateColumns: "1.5fr 1.4fr 0.9fr 0.8fr 0.8fr 0.7fr 0.8fr" }}
          >
            <div>AGENT</div>
            <div>TYPE</div>
            <div>TRUST</div>
            <div>SPEND 24H</div>
            <div>LIMIT</div>
            <div>AUTONOMY</div>
            <div>STATUS</div>
          </div>
          {rows.map((row) => {
            const isPaused = !!paused[row.id];
            const filled = Math.round(row.trust / 10);
            return (
              <div
                key={row.id}
                className="grid gap-3 items-center px-4 py-3.5 border-b border-white/6 hover:bg-white/3 transition-colors duration-150"
                style={{ gridTemplateColumns: "1.5fr 1.4fr 0.9fr 0.8fr 0.8fr 0.7fr 0.8fr" }}
              >
                <div className="text-[13px] font-semibold">{row.name}</div>
                <div className="font-mono text-[9.5px] tracking-[0.06em] uppercase text-[#8a8a86]">{row.type}</div>
                <div className="flex gap-[2px] items-center">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="w-[5px] h-[11px]"
                      style={{
                        background:
                          i < filled ? (row.trust < 70 ? "oklch(55% 0.1 30)" : "rgba(255,255,255,0.6)") : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[11.5px]">{row.spend}</div>
                <div className="font-mono text-[11.5px] text-[#8a8a86]">{row.limit}</div>
                <AutonomyToggle paused={isPaused} onToggle={() => toggle(row.id)} />
                <div
                  className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
                  style={{ color: statusColor(row.status, isPaused) }}
                >
                  {isPaused ? "PAUSED" : row.status.toUpperCase()}
                </div>
              </div>
            );
          })}
          {toggleError && (
            <div className="mt-3 font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">
              {toggleError}
            </div>
          )}
        </div>

        {/* right column */}
        <div className="w-[360px] flex-none flex flex-col gap-4">
          <div className="border border-white/12 bg-graphite p-5">
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86]">TREASURY WALLET</div>
            <div className="text-[30px] font-extrabold tracking-[-0.02em] mt-2.5">
              $128,400 <span className="text-[13px] font-semibold text-[#8a8a86]">USDC</span>
            </div>
            <div className="font-mono text-[10.5px] text-[#8a8a86] mt-1.5">Escrow held · $18,210</div>
            <div className="font-mono text-[10px] text-[#5f5f5b] mt-3">0x7fA3…c92E</div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onOpenFund}
                className="flex-1 text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/24 py-2.5 cursor-pointer hover:bg-white/6 transition-colors duration-150"
              >
                FUND
              </button>
              <button className="flex-1 text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/14 py-2.5 text-[#8a8a86] cursor-pointer hover:bg-white/4 transition-colors duration-150">
                WITHDRAW
              </button>
            </div>
          </div>

          <div className="border border-white/12 bg-graphite p-5">
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-3.5">GLOBAL LIMITS</div>
            {globalLimits.map((g) => (
              <div key={g.label} className="flex justify-between items-center py-[9px] border-b border-white/6 last:border-b-0">
                <div className="text-[12.5px]">{g.label}</div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-[11.5px]">{g.value}</div>
                  <div className="font-mono text-[9px] tracking-[0.08em] uppercase text-[#5f5f5b] cursor-pointer hover:text-bone transition-colors duration-150">
                    EDIT
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-[oklch(35%_0.06_30)] bg-graphite p-5 mt-auto">
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[oklch(55%_0.1_30)]">EMERGENCY</div>
            <div className="text-[13px] font-semibold mt-2">Halt all agent autonomy</div>
            <div className="font-mono text-[10px] text-[#8a8a86] mt-1 leading-[1.5]">
              Freezes routing, negotiation and settlement. Escrow remains locked.
            </div>
            <button className="mt-3.5 w-full text-center font-mono text-[10.5px] tracking-[0.1em] uppercase border border-[oklch(45%_0.09_30)] text-[oklch(65%_0.1_30)] py-2.5 cursor-pointer hover:bg-[oklch(20%_0.04_30)] transition-colors duration-150">
              OVERRIDE — HALT PROTOCOL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
