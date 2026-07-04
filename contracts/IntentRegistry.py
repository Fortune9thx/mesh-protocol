# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# Mesh Protocol — Intent Registry
# GenLayer Intelligent Contract
# Layer 2: Intent storage and lifecycle

from genlayer import *

class IntentRegistry(gl.Contract):
    """
    On-chain registry for intents. Stores minimal data; full payload lives off-chain.
    The storage_hash points to IPFS/content-addressed full intent data.
    """

    # intent_id -> requester
    requesters: TreeMap[str, Address]
    # intent_id -> status
    statuses: TreeMap[str, str]
    # intent_id -> budget (GEN wei)
    budgets: TreeMap[str, u256]
    # intent_id -> IPFS hash of full intent payload
    storage_hashes: TreeMap[str, str]
    # intent_id -> deadline (unix timestamp)
    deadlines: TreeMap[str, u64]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def submit_intent(
        self,
        intent_id: str,
        storage_hash: str,
        budget: u256,
        deadline: u64,
    ) -> None:
        assert intent_id not in self.requesters, "Intent already exists"
        self.requesters[intent_id] = gl.message.sender_address
        self.statuses[intent_id] = "pending"
        self.budgets[intent_id] = budget
        self.storage_hashes[intent_id] = storage_hash
        self.deadlines[intent_id] = deadline

    @gl.public.write
    def update_status(self, intent_id: str, new_status: str) -> None:
        assert intent_id in self.requesters, "Intent not found"
        allowed = {"pending", "matching", "negotiating", "in_progress", "delivered", "verified", "settled", "cancelled", "failed"}
        assert new_status in allowed, "Invalid status"
        self.statuses[intent_id] = new_status

    @gl.public.write
    def cancel_intent(self, intent_id: str) -> None:
        assert intent_id in self.requesters, "Intent not found"
        assert self.requesters[intent_id] == gl.message.sender_address, "Not requester"
        assert self.statuses[intent_id] in {"pending", "matching"}, "Cannot cancel at this stage"
        self.statuses[intent_id] = "cancelled"

    @gl.public.view
    def get_status(self, intent_id: str) -> str:
        return self.statuses.get(intent_id, "unknown")

    @gl.public.view
    def get_requester(self, intent_id: str) -> str:
        if intent_id in self.requesters:
            return self.requesters[intent_id].as_hex
        return ""

    @gl.public.view
    def get_budget(self, intent_id: str) -> u256:
        return self.budgets.get(intent_id, u256(0))
