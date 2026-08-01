"use client";

// Translates raw contract revert strings into clean, specific copy. Contract
// assert messages are already descriptive (written for exactly this purpose),
// but they arrive wrapped in RPC/execution noise and carry raw wei amounts --
// this strips the noise and converts wei to GEN so the message a user sees
// reads like product copy, not a stack trace.

function weiToGen(wei: string): string {
  try {
    const n = Number(BigInt(wei)) / 1e18;
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return wei;
  }
}

const PATTERNS: Array<{ match: RegExp; format: (m: RegExpMatchArray) => string }> = [
  {
    match: /Locked amount must equal the negotiation's agreed price \((\d+) wei\)/,
    format: (m) => `The amount must exactly match the negotiation's accepted price (${weiToGen(m[1])} GEN). Try again from the negotiation panel so it fills in automatically.`,
  },
  {
    match: /Proposed price exceeds requester agent's configured spending limit \((\d+) wei\)/,
    format: (m) => `This price is above the requester agent's configured spending cap (${weiToGen(m[1])} GEN). Lower the price or raise the agent's spending limit.`,
  },
  {
    match: /This negotiation has already been locked into an escrow/,
    format: () => "This negotiation already has an escrow locked against it — each accepted negotiation can only be funded once.",
  },
  {
    match: /EscrowVault is paused/,
    format: () => "The protocol is temporarily paused by the admin. Try again once it's back online.",
  },
  {
    match: /Provider must submit delivery evidence before the payer can release/,
    format: () => "Waiting on the provider's delivery proof before funds can be released.",
  },
  {
    match: /Negotiation not accepted \(status: (\w+)\)/,
    format: (m) => `This negotiation isn't accepted yet (currently: ${m[1]}). Both sides need an accepted price before escrow can move.`,
  },
  {
    match: /Only the intent's registered requester may lock this escrow/,
    format: () => "Only the wallet that submitted this intent can lock escrow against it.",
  },
  {
    match: /Payee must be the negotiation's registered provider wallet/,
    format: () => "The payee must be the registered agent's owner wallet — it can't be entered manually.",
  },
  {
    match: /Provider agent is not active/,
    format: () => "This provider agent is currently paused and can't accept new escrow.",
  },
];

export function humanizeError(raw: string | undefined | null): string {
  if (!raw) return "Something went wrong. Please try again.";
  for (const { match, format } of PATTERNS) {
    const m = raw.match(match);
    if (m) return format(m);
  }
  // Fall back to the raw assert message with RPC/wrapper noise stripped.
  const cleaned = raw
    .replace(/^.*?execution reverted:?\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
  return cleaned.length > 0 && cleaned.length < 200 ? cleaned : "Transaction failed. Please try again.";
}
