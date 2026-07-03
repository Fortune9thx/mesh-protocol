"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ModalKind, View } from "@/lib/types";
import { TopBar } from "@/components/shell/TopBar";
import { LeftRail } from "@/components/shell/LeftRail";
import { BottomTicker } from "@/components/shell/BottomTicker";
import { OverviewSurface } from "@/components/surfaces/OverviewSurface";
import { ConsoleSurface } from "@/components/surfaces/ConsoleSurface";
import { WorkbenchSurface } from "@/components/surfaces/WorkbenchSurface";
import { RegisterAgentModal } from "@/components/modals/RegisterAgentModal";
import { ArbitrateDisputeModal } from "@/components/modals/ArbitrateDisputeModal";
import { FundWalletModal } from "@/components/modals/FundWalletModal";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { toTickerLine } from "@/lib/eventFormat";
import { useAgents } from "@/lib/useAgents";
import { useTopologyData } from "@/lib/useTopologyData";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [modal, setModal] = useState<ModalKind>(null);
  const { events: liveEvents, raw: liveRaw } = useLiveEvents();
  const liveTickerLines = liveRaw.map(toTickerLine);
  const { agents, refetch: refetchAgents } = useAgents();
  const { nodes: realNodes, edges: realEdges } = useTopologyData(agents);
  const { escrows: disputedEscrows, refetch: refetchDisputes } = useDisputedEscrows();

  const goToWorkbench = () => setView("workbench");

  return (
    <div className="min-w-[1280px] w-full h-screen flex flex-col bg-obsidian text-bone relative overflow-hidden">
      <TopBar view={view} />

      <div className="flex-1 flex min-h-0 relative">
        <LeftRail view={view} onChange={setView} />

        <AnimatePresence mode="wait">
          {view === "overview" && (
            <motion.div
              key="overview"
              className="flex-1 flex min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <OverviewSurface
                onOpenArbitrate={() => setModal("arbitrate")}
                onGoToConsole={() => setView("console")}
                onGoToWorkbench={goToWorkbench}
                liveEvents={liveEvents}
                realNodes={realNodes}
                realEdges={realEdges}
              />
            </motion.div>
          )}
          {view === "console" && (
            <motion.div
              key="console"
              className="flex-1 flex min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <ConsoleSurface
                onOpenRegister={() => setModal("register")}
                onOpenFund={() => setModal("fund")}
                agents={agents}
              />
            </motion.div>
          )}
          {view === "workbench" && (
            <motion.div
              key="workbench"
              className="flex-1 flex min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <WorkbenchSurface />
            </motion.div>
          )}
        </AnimatePresence>

        {modal === "register" && (
          <RegisterAgentModal onClose={() => setModal(null)} onRegistered={refetchAgents} />
        )}
        {modal === "arbitrate" && (
          <ArbitrateDisputeModal
            onClose={() => setModal(null)}
            escrow={disputedEscrows[0] ?? null}
            onResolved={refetchDisputes}
          />
        )}
        {modal === "fund" && <FundWalletModal onClose={() => setModal(null)} />}
      </div>

      <BottomTicker liveLines={liveTickerLines} />
    </div>
  );
}
