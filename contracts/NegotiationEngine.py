# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# Mesh Protocol -- Negotiation Engine
# GenLayer Intelligent Contract
# Layer 3: On-chain AI-powered negotiation
#
# The centrepiece of Mesh Protocol's on-chain orchestration.
# propose_and_evaluate() uses GenLayer's Equivalence Principle to run an
# LLM consensus across all validator nodes -- the AI verdict (accepted /
# counter_N / rejected) is agreed upon before any storage write commits.
# No off-chain negotiation service required.

from genlayer import *

class NegotiationEngine(gl.Contract):
    """
    On-chain negotiation with embedded AI evaluation.
    Every proposed deal is evaluated by GenLayer's LLM consensus before
    the status is written to chain -- trustless, verifiable price arbitration.
    """

    statuses: TreeMap[str, str]         # negotiation_id -> status
    agreed_prices: TreeMap[str, u256]   # negotiation_id -> final price
    providers: TreeMap[str, str]        # negotiation_id -> provider agent_id
    requesters: TreeMap[str, str]       # negotiation_id -> requester agent_id
    intent_map: TreeMap[str, str]       # negotiation_id -> intent_id
    ai_verdicts: TreeMap[str, str]      # negotiation_id -> raw AI verdict

    # Enumeration index (DynArray not supported; TreeMap key must be str)
    neg_count: u256
    neg_index: TreeMap[str, str]        # str(index) -> negotiation_id

    def __init__(self) -> None:
        self.neg_count = u256(0)

    # ---- Helper (must be defined before callers per GenVM static analyser) ----

    def _apply_verdict(self, negotiation_id: str, verdict: str, proposed_price: u256) -> None:
        v = verdict.strip().lower()
        self.ai_verdicts[negotiation_id] = v
        if v == "accepted":
            self.statuses[negotiation_id] = "accepted"
            self.agreed_prices[negotiation_id] = proposed_price
        elif v.startswith("counter_"):
            try:
                counter_price = int(v.split("_", 1)[1])
                self.statuses[negotiation_id] = "counter"
                self.agreed_prices[negotiation_id] = u256(counter_price)
            except Exception:
                self.statuses[negotiation_id] = "pending"
                self.agreed_prices[negotiation_id] = proposed_price
        else:
            self.statuses[negotiation_id] = "rejected"
            self.agreed_prices[negotiation_id] = u256(0)

    # ---- Write methods ----

    @gl.public.write
    def propose_and_evaluate(
        self,
        negotiation_id: str,
        intent_id: str,
        requester: str,
        provider: str,
        proposed_price: u256,
        intent_description: str,
    ) -> None:
        """
        Submit a price proposal. GenLayer validators run LLM consensus to decide:
        - 'accepted'   -- price is fair, deal locked
        - 'counter_N'  -- AI suggests N GEN as a fairer price
        - 'rejected'   -- price is unfair or intent is invalid

        The verdict is agreed across all validators before any storage commits.
        """
        assert negotiation_id not in self.statuses, "Negotiation already exists"

        # Record parties before non-deterministic block
        self.providers[negotiation_id] = provider
        self.requesters[negotiation_id] = requester
        self.intent_map[negotiation_id] = intent_id

        # Copy storage values to locals -- non-det blocks cannot touch storage
        price_val = int(proposed_price)
        intent_desc = str(intent_description)

        # GenLayer Equivalence Principle: LLM consensus across all validators
        verdict = gl.eq_principle.prompt_non_comparative(
            lambda: None,
            task=(
                "You are a neutral arbitrator for a decentralised AI agent marketplace.\n\n"
                f"Task description: {intent_desc}\n"
                f"Proposed price: {price_val} GEN tokens\n\n"
                "Evaluate whether this price is fair for the described service.\n"
                "Consider the complexity, specificity, and value of the task.\n"
                "Typical market rates: simple tasks 10-100 GEN, "
                "complex research 100-1000 GEN, "
                "multi-step orchestration 500-5000 GEN.\n\n"
                "Respond with EXACTLY ONE of:\n"
                "- accepted\n"
                "- counter_N  (where N is your integer suggested price)\n"
                "- rejected\n\n"
                "Reply with ONLY the verdict, nothing else."
            ),
            criteria=(
                "Response must be exactly 'accepted', 'rejected', "
                "or 'counter_' followed by an integer with no spaces or extra text"
            ),
        )

        # Append to enumeration index
        idx = self.neg_count
        self.neg_index[str(int(idx))] = negotiation_id
        self.neg_count = idx + u256(1)

        # Apply AI verdict to storage
        self._apply_verdict(negotiation_id, str(verdict), proposed_price)

    @gl.public.write
    def record_negotiation(
        self,
        negotiation_id: str,
        intent_id: str,
        requester: str,
        provider: str,
        proposed_price: u256,
    ) -> None:
        """Manual record without AI evaluation -- for admin use."""
        assert negotiation_id not in self.statuses, "Already exists"
        self.statuses[negotiation_id] = "pending"
        self.agreed_prices[negotiation_id] = proposed_price
        self.providers[negotiation_id] = provider
        self.requesters[negotiation_id] = requester
        self.intent_map[negotiation_id] = intent_id
        self.ai_verdicts[negotiation_id] = "manual"

        idx = self.neg_count
        self.neg_index[str(int(idx))] = negotiation_id
        self.neg_count = idx + u256(1)

    @gl.public.write
    def accept(self, negotiation_id: str, final_price: u256) -> None:
        assert self.statuses.get(negotiation_id, "") in {"pending", "counter"}, "Invalid state"
        self.statuses[negotiation_id] = "accepted"
        self.agreed_prices[negotiation_id] = final_price

    @gl.public.write
    def reject(self, negotiation_id: str) -> None:
        assert self.statuses.get(negotiation_id, "") in {"pending", "counter"}, "Invalid state"
        self.statuses[negotiation_id] = "rejected"

    # ---- Views ----

    @gl.public.view
    def get_neg_count(self) -> u256:
        return self.neg_count

    @gl.public.view
    def get_neg_id_at(self, index: u256) -> str:
        return self.neg_index.get(str(int(index)), "")

    @gl.public.view
    def get_negotiation_data(self, negotiation_id: str) -> str:
        """Returns pipe-delimited negotiation data string for frontend parsing."""
        if negotiation_id not in self.statuses:
            return ""
        status = self.statuses.get(negotiation_id, "unknown")
        price = int(self.agreed_prices.get(negotiation_id, u256(0)))
        provider = self.providers.get(negotiation_id, "")
        requester = self.requesters.get(negotiation_id, "")
        intent = self.intent_map.get(negotiation_id, "")
        verdict = self.ai_verdicts.get(negotiation_id, "")
        return f"status={status}|price={price}|provider={provider}|requester={requester}|intent={intent}|verdict={verdict}"

    @gl.public.view
    def get_status(self, negotiation_id: str) -> str:
        return self.statuses.get(negotiation_id, "unknown")

    @gl.public.view
    def get_agreed_price(self, negotiation_id: str) -> u256:
        return self.agreed_prices.get(negotiation_id, u256(0))
