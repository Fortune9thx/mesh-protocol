# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# Mesh Protocol -- Intent Registry
# GenLayer Intelligent Contract
# Layer 2: Full intent payload stored on-chain (no IPFS hash -- full data)

from genlayer import *

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

    # Enumeration index (DynArray not supported; TreeMap key must be str)
    intent_count: u256
    intent_index: TreeMap[str, str]         # str(index) -> intent_id

    def __init__(self) -> None:
        self.intent_count = u256(0)

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

        # Append to enumeration index
        idx = self.intent_count
        self.intent_index[str(int(idx))] = intent_id
        self.intent_count = idx + u256(1)

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

    # ---- Views ----

    @gl.public.view
    def get_intent_count(self) -> u256:
        return self.intent_count

    @gl.public.view
    def get_intent_id_at(self, index: u256) -> str:
        return self.intent_index.get(str(int(index)), "")

    @gl.public.view
    def get_intent_data(self, intent_id: str) -> str:
        """Returns pipe-delimited intent data string for frontend parsing."""
        if intent_id not in self.requesters:
            return ""
        title = self.titles.get(intent_id, "")
        desc = self.descriptions.get(intent_id, "")
        reqs = self.requirements_map.get(intent_id, "")
        priority = self.priorities.get(intent_id, "medium")
        budget = int(self.budgets.get(intent_id, u256(0)))
        deadline = int(self.deadlines.get(intent_id, u64(0)))
        status = self.statuses.get(intent_id, "unknown")
        requester = self.requesters[intent_id].as_hex
        return f"title={title}|desc={desc}|reqs={reqs}|priority={priority}|budget={budget}|deadline={deadline}|status={status}|requester={requester}"

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
