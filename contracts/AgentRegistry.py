# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# Mesh Protocol -- Agent Registry
# GenLayer Intelligent Contract
# Layer 1: Identity

from genlayer import *

class AgentRegistry(gl.Contract):
    """
    On-chain agent identity, capabilities, and operator controls.
    Full agent metadata stored on-chain -- no off-chain indexer required.
    """

    # Core identity
    owner_map: TreeMap[str, Address]        # agent_id -> owner_wallet
    status_map: TreeMap[str, str]           # agent_id -> active|paused|deactivated
    name_map: TreeMap[str, str]             # agent_id -> display name
    category_map: TreeMap[str, str]         # agent_id -> category
    capabilities_map: TreeMap[str, str]     # agent_id -> comma-separated capabilities
    pricing_map: TreeMap[str, str]          # agent_id -> pricing_model
    base_price_map: TreeMap[str, u256]      # agent_id -> base price (GEN wei)
    spending_limits: TreeMap[str, u256]     # agent_id -> limit in GEN wei
    autonomy_levels: TreeMap[str, u64]      # agent_id -> 0-3

    # Enumeration index (DynArray not supported; TreeMap key must be str)
    agent_count: u256
    agent_index: TreeMap[str, str]          # str(index) -> agent_id

    def __init__(self) -> None:
        self.agent_count = u256(0)

    @gl.public.write
    def register_agent(
        self,
        agent_id: str,
        name: str,
        category: str,
        capabilities: str,
        base_price: u256,
        pricing_model: str,
        autonomy_level: u64,
        spending_limit: u256,
    ) -> None:
        assert agent_id not in self.owner_map, "Agent already registered"
        assert autonomy_level <= u64(3), "Autonomy level must be 0-3"

        self.owner_map[agent_id] = gl.message.sender_address
        self.status_map[agent_id] = "active"
        self.name_map[agent_id] = name
        self.category_map[agent_id] = category
        self.capabilities_map[agent_id] = capabilities
        self.pricing_map[agent_id] = pricing_model
        self.base_price_map[agent_id] = base_price
        self.autonomy_levels[agent_id] = autonomy_level
        self.spending_limits[agent_id] = spending_limit

        # Append to enumeration index
        idx = self.agent_count
        self.agent_index[str(int(idx))] = agent_id
        self.agent_count = idx + u256(1)

    @gl.public.write
    def update_agent(self, agent_id: str, new_spending_limit: u256, new_pricing_model: str) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_address, "Not owner"
        self.spending_limits[agent_id] = new_spending_limit
        self.pricing_map[agent_id] = new_pricing_model

    @gl.public.write
    def pause_agent(self, agent_id: str) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_address, "Not owner"
        self.status_map[agent_id] = "paused"

    @gl.public.write
    def reactivate_agent(self, agent_id: str) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_address, "Not owner"
        self.status_map[agent_id] = "active"

    @gl.public.write
    def deactivate_agent(self, agent_id: str) -> None:
        assert agent_id in self.owner_map, "Agent not found"
        assert self.owner_map[agent_id] == gl.message.sender_address, "Not owner"
        self.status_map[agent_id] = "deactivated"

    # ---- Views ----

    @gl.public.view
    def get_agent_count(self) -> u256:
        return self.agent_count

    @gl.public.view
    def get_agent_id_at(self, index: u256) -> str:
        return self.agent_index.get(str(int(index)), "")

    @gl.public.view
    def get_agent_data(self, agent_id: str) -> str:
        """Returns pipe-delimited agent data string for frontend parsing."""
        if agent_id not in self.owner_map:
            return ""
        name = self.name_map.get(agent_id, "")
        cat = self.category_map.get(agent_id, "")
        caps = self.capabilities_map.get(agent_id, "")
        status = self.status_map.get(agent_id, "unknown")
        limit = int(self.spending_limits.get(agent_id, u256(0)))
        level = int(self.autonomy_levels.get(agent_id, u64(0)))
        pricing = self.pricing_map.get(agent_id, "per_task")
        price = int(self.base_price_map.get(agent_id, u256(0)))
        owner = self.owner_map[agent_id].as_hex
        return f"name={name}|cat={cat}|caps={caps}|status={status}|limit={limit}|level={level}|pricing={pricing}|price={price}|owner={owner}"

    @gl.public.view
    def get_agent_status(self, agent_id: str) -> str:
        return self.status_map.get(agent_id, "unknown")

    @gl.public.view
    def get_owner(self, agent_id: str) -> str:
        if agent_id in self.owner_map:
            return self.owner_map[agent_id].as_hex
        return ""

    @gl.public.view
    def is_active(self, agent_id: str) -> bool:
        return self.status_map.get(agent_id, "") == "active"
