export function NEGOTIATION_PROMPT(
  intentTitle: string,
  budget: number,
  proposed: number,
  counter: number | null,
  round: number,
  maxRounds: number
): string {
  return `You are the Mesh Protocol autonomous negotiation engine.

## Context
Intent: ${intentTitle}
Budget limit: ${budget} GEN
Negotiation round: ${round} of ${maxRounds}
Requester proposed: ${proposed} GEN
Provider counter-offered: ${counter ?? "no counter yet"} GEN

## Task
Should the requester accept the counter-offer, make a new counter, or reject?

Rules:
- Never exceed the budget
- Try to find a fair price for both parties
- After ${maxRounds} rounds, recommend reject if no deal
- A deal within 10% of budget is acceptable

Respond with JSON:
{
  "recommendation": "accept" | "counter" | "reject",
  "suggested_price": <number if counter>,
  "reasoning": "<brief explanation>"
}`;
}
