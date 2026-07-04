# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# Mesh Protocol — Negotiation Engine
# GenLayer Intelligent Contract
# Layer 4: On-chain negotiation state

from genlayer import *

class NegotiationEngine(gl.Contract):
    """
    Records negotiation state on-chain.
    The actual LLM-powered negotiation logic runs off-chain;
    this contract anchors accepted deals immutably.
    """

    statuses: TreeMap[str, str]          # negotiation_id -> status
    agreed_prices: TreeMap[str, u256]    # negotiation_id -> final price
    providers: TreeMap[str, str]         # negotiation_id -> provider agent_id
    requesters: TreeMap[str, str]        # negotiation_id -> requester agent_id
    intent_map: TreeMap[str, str]        # negotiation_id -> intent_id

    def __init__(self) -> None:
        pass

    @gl.public.write
    def record_negotiation(
        self,
        negotiation_id: str,
        intent_id: str,
        requester: str,
        provider: str,
        proposed_price: u256,
    ) -> None:
        assert negotiation_id not in self.statuses, "Already exists"
        self.statuses[negotiation_id] = "pending"
        self.agreed_prices[negotiation_id] = proposed_price
        self.providers[negotiation_id] = provider
        self.requesters[negotiation_id] = requester
        self.intent_map[negotiation_id] = intent_id

    @gl.public.write
    def accept(self, negotiation_id: str, final_price: u256) -> None:
        assert self.statuses.get(negotiation_id, "") in {"pending", "counter"}, "Invalid state"
        self.statuses[negotiation_id] = "accepted"
        self.agreed_prices[negotiation_id] = final_price

    @gl.public.write
    def reject(self, negotiation_id: str) -> None:
        assert self.statuses.get(negotiation_id, "") in {"pending", "counter"}, "Invalid state"
        self.statuses[negotiation_id] = "rejected"

    @gl.public.view
    def get_status(self, negotiation_id: str) -> str:
        return self.statuses.get(negotiation_id, "unknown")

    @gl.public.view
    def get_agreed_price(self, negotiation_id: str) -> u256:
        return self.agreed_prices.get(negotiation_id, u256(0))
