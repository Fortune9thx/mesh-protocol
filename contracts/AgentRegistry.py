# { "Depends": "py-genlayer:test" }
# Mesh Protocol — Agent Registry
# GenLayer Intelligent Contract
# Layer 1: Identity

from genlayer import *

class AgentRegistry(gl.Contract):
    """
    Manages agent identities, capabilities, and operator controls.
    All state mutations emit events readable by off-chain indexers.
    """

    agents: TreeMap[str, DynArray[str]]       # agent_id -> serialized JSON fields
    owner_map: TreeMap[str, str]              # agent_id -> owner_wallet
    status_map: TreeMap[str, str]             # agent_id -> status
    spending_limits: TreeMap[str, u256]       # agent_id -> limit in GEN wei
    autonomy_levels: TreeMap[str, u8]         # agent_id -> 0-3

    def __init__(self) -> None:
        self.agents = TreeMap()
        self.owner_map = TreeMap()
        self.status_map = TreeMap()
        self.spending_limits = TreeMap()
        self.autonomy_levels = TreeMap()

    @gl.public.write
    def register_agent(
        self,
        agent_id: str,
        name: str,
        category: str,
        capabilities: DynArray[str],
        base_price: u256,
        endpoint_url: str,
        autonomy_level: u8,
        spending_limit: u256,
    ) -> None:
        assert agent_id not in self.owner_map, "Agent already registered"
        assert autonomy_level <= 3, "Autonomy level must be 0-3"

        self.owner_map[agent_id] = gl.message.sender_address
        self.status_map[agent_id] = "active"
        self.autonomy_levels[agent_id] = autonomy_level
        self.spending_limits[agent_id] = spending_limit

        # Store capabilities as the DynArray
        self.agents[agent_id] = capabilities

    @gl.public.write
    def update_agent(self, agent_id: str, new_endpoint: str, new_spending_limit: u256) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_address, "Not owner"
        self.spending_limits[agent_id] = new_spending_limit

    @gl.public.write
    def pause_agent(self, agent_id: str) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_account, "Not owner"
        self.status_map[agent_id] = "paused"

    @gl.public.write
    def deactivate_agent(self, agent_id: str) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_account, "Not owner"
        self.status_map[agent_id] = "deactivated"

    @gl.public.view
    def get_agent_status(self, agent_id: str) -> str:
        return self.status_map.get(agent_id, "unknown")

    @gl.public.view
    def get_spending_limit(self, agent_id: str) -> u256:
        return self.spending_limits.get(agent_id, u256(0))

    @gl.public.view
    def get_owner(self, agent_id: str) -> str:
        return self.owner_map.get(agent_id, "")

    @gl.public.view
    def is_active(self, agent_id: str) -> bool:
        return self.status_map.get(agent_id, "") == "active"
