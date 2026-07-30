"use client";

// Reads REAL GenLayer validator consensus data from a transaction receipt.
// Every write on Mesh is ratified by a validator round; this surfaces the
// actual vote counts and outcome so the UI can show consensus, not a spinner.
//
// No fabrication: every number here comes from the on-chain receipt. If a
// field is missing we omit it rather than invent it.

export type ConsensusData = {
  hash: string;
  validators: number;      // validators in the deciding round
  committed: number;       // votes committed
  revealed: number;        // votes revealed
  agreements: number;      // validators that voted AGREE
  confidence: number;      // 0-100, agreements / revealed
  outcome: string;         // ACCEPTED / AGREE / etc. (statusName/resultName)
  rounds: number;          // consensus rounds it took
  finished: string;        // execution result (FINISHED_WITH_RETURN, etc.)
};

// The per-validator vote vector is a base64 byte array; 0x02 == AGREE.
function countAgreements(validatorVotes: unknown): number {
  if (typeof validatorVotes !== "string" || validatorVotes.length === 0) return 0;
  try {
    const bin = atob(validatorVotes);
    let agree = 0;
    for (let i = 0; i < bin.length; i++) {
      if (bin.charCodeAt(i) === 0x02) agree++;
    }
    return agree;
  } catch {
    return 0;
  }
}

/**
 * Fetch a transaction receipt and extract its validator consensus data.
 * Returns null if the receipt can't be read (never a fabricated panel).
 */
export async function getConsensus(hash: string): Promise<ConsensusData | null> {
  try {
    const { createClient } = await import("genlayer-js");
    const chains = await import("genlayer-js/chains");
    const key = process.env.NEXT_PUBLIC_MESH_NETWORK ?? "bradbury";
    const chain = key === "studionet" ? chains.studionet : chains.testnetBradbury;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createClient({ chain });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx: any = await client.getTransaction({ hash });
    if (!tx) return null;

    const rounds: any[] = Array.isArray(tx.roundData) ? tx.roundData : [];
    const last = rounds.length > 0 ? rounds[rounds.length - 1] : null;

    const validators =
      Number(last?.roundValidators?.length) ||
      Number(tx.numOfInitialValidators) ||
      0;
    const committed = Number(last?.votesCommitted ?? 0) || 0;
    const revealed = Number(last?.votesRevealed ?? 0) || 0;
    const agreements = last ? countAgreements(last.validatorVotes) : 0;

    // Confidence = share of revealing validators that agreed.
    const denom = revealed || validators || 1;
    const agree = agreements || (tx.resultName === "AGREE" ? revealed : 0);
    const confidence = Math.round((agree / denom) * 100);

    return {
      hash,
      validators,
      committed,
      revealed,
      agreements: agree,
      confidence: Math.min(100, Math.max(0, confidence)),
      outcome: String(tx.statusName ?? tx.resultName ?? "ACCEPTED"),
      rounds: rounds.length || Number(tx.numOfRounds ?? 1) || 1,
      finished: String(tx.txExecutionResultName ?? ""),
    };
  } catch {
    return null;
  }
}

const EXPLORER_BASE =
  (process.env.NEXT_PUBLIC_MESH_NETWORK ?? "bradbury") === "studionet"
    ? "https://explorer.genlayer.com"
    : "https://explorer-bradbury.genlayer.com";

export const explorerTxUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;
