# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

# Mesh Protocol -- Intent Registry (Layer 2): full intent payload stored on-chain.


class IntentRegistry(gl.Contract):
    """
    On-chain registry with full intent payload.
    Title, description, requirements, budget all stored on-chain --
    no off-chain content-addressing required.
    """

    # Full payload fields
    requesters: TreeMap[str, Address]       # intent_id -> requester
    statuses: TreeMap[str, str]             # intent_id -> status
    budgets: TreeMap[str, u256]             # intent_id -> budget (GEN wei)
    deadlines: TreeMap[str, u64]            # intent_id -> unix timestamp
    titles: TreeMap[str, str]               # intent_id -> title
    descriptions: TreeMap[str, str]         # intent_id -> description
    requirements_map: TreeMap[str, str]     # intent_id -> comma-separated requirements
    priorities: TreeMap[str, str]           # intent_id -> low|medium|high|critical

    # Ordered enumeration of intent ids for pagination.
    intent_ids: DynArray[str]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def submit_intent(
        self,
        intent_id: str,
        title: str,
        description: str,
        requirements: str,
        priority: str,
        budget: u256,
        deadline: u64,
    ) -> None:
        assert intent_id not in self.requesters, "Intent already exists"
        allowed_priorities = {"low", "medium", "high", "critical"}
        assert priority in allowed_priorities, "Invalid priority"

        self.requesters[intent_id] = gl.message.sender_address
        self.statuses[intent_id] = "pending"
        self.budgets[intent_id] = budget
        self.deadlines[intent_id] = deadline
        self.titles[intent_id] = title
        self.descriptions[intent_id] = description
        self.requirements_map[intent_id] = requirements
        self.priorities[intent_id] = priority

        self.intent_ids.append(intent_id)

    @gl.public.write
    def update_status(self, intent_id: str, new_status: str) -> None:
        assert intent_id in self.requesters, "Intent not found"
        assert self.requesters[intent_id] == gl.message.sender_address, "Only the requester may update status"
        allowed = {"pending", "matching", "negotiating", "in_progress", "delivered", "verified", "settled", "cancelled", "failed"}
        assert new_status in allowed, "Invalid status"
        self.statuses[intent_id] = new_status

    @gl.public.write
    def cancel_intent(self, intent_id: str) -> None:
        assert intent_id in self.requesters, "Intent not found"
        assert self.requesters[intent_id] == gl.message.sender_address, "Not requester"
        assert self.statuses[intent_id] in {"pending", "matching"}, "Cannot cancel at this stage"
        self.statuses[intent_id] = "cancelled"

    # ---- Views ----

    @gl.public.view
    def get_intent_count(self) -> u256:
        return u256(len(self.intent_ids))

    @gl.public.view
    def get_intent_id_at(self, index: u256) -> str:
        i = int(index)
        if i < 0 or i >= len(self.intent_ids):
            return ""
        return self.intent_ids[i]

    @gl.public.view
    def get_intent_data(self, intent_id: str) -> dict:
        """Full intent record. Empty dict if the intent is unknown."""
        if intent_id not in self.requesters:
            return {}
        return {
            "title": self.titles.get(intent_id, ""),
            "description": self.descriptions.get(intent_id, ""),
            "requirements": self.requirements_map.get(intent_id, ""),
            "priority": self.priorities.get(intent_id, "medium"),
            "budget": str(self.budgets.get(intent_id, u256(0))),
            "deadline": int(self.deadlines.get(intent_id, u64(0))),
            "status": self.statuses.get(intent_id, "unknown"),
            "requester": self.requesters[intent_id].as_hex,
        }

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
