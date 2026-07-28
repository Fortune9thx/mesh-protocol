# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# Mesh Protocol -- Reputation Ledger
# GenLayer Intelligent Contract
# Layer 5: Post-settlement reputation
#
# ACCESS CONTROL: reputation is an institutional record. Only the admin
# (deployer) or an explicitly authorized writer (e.g. the settlement layer)
# may mutate it. Arbitrary callers are rejected. Role-map keys are stored as
# lowercased hex so lookups never miss on checksum-case differences.

from genlayer import *

class ReputationLedger(gl.Contract):
    """
    On-chain immutable reputation scores.
    Written only by authorized settlement writers; readable by anyone.
    """

    # ---- roles ----
    admin: Address
    writers: TreeMap[str, u64]          # lowercased hex -> 1 if authorized

    # ---- reputation state ----
    total_tasks: TreeMap[str, u64]
    successful: TreeMap[str, u64]
    failed: TreeMap[str, u64]
    quality_sum: TreeMap[str, u64]      # sum of quality scores (0-100 each)

    def __init__(self) -> None:
        self.admin = gl.message.sender_address

    # ---- internal role check ----
    def _is_writer(self, addr: Address) -> bool:
        if addr == self.admin:
            return True
        return self.writers.get(addr.as_hex.lower(), u64(0)) == u64(1)

    # ---- role management (admin only) ----
    @gl.public.write
    def authorize_writer(self, writer: str) -> None:
        assert gl.message.sender_address == self.admin, "Only admin may authorize writers"
        self.writers[Address(writer).as_hex.lower()] = u64(1)

    @gl.public.write
    def revoke_writer(self, writer: str) -> None:
        assert gl.message.sender_address == self.admin, "Only admin may revoke writers"
        self.writers[Address(writer).as_hex.lower()] = u64(0)

    @gl.public.write
    def transfer_admin(self, new_admin: str) -> None:
        assert gl.message.sender_address == self.admin, "Only admin may transfer"
        self.admin = Address(new_admin)

    # ---- reputation writes (authorized writers only) ----
    @gl.public.write
    def record_outcome(self, agent_id: str, success: bool, quality_score: u64) -> None:
        """Record task outcome. Rejects any caller that is not an authorized writer."""
        assert self._is_writer(gl.message.sender_address), "Unauthorized: not a reputation writer"
        assert quality_score <= u64(100), "Quality score must be 0-100"

        total = self.total_tasks.get(agent_id, u64(0))
        self.total_tasks[agent_id] = total + u64(1)

        if success:
            s = self.successful.get(agent_id, u64(0))
            self.successful[agent_id] = s + u64(1)
        else:
            f = self.failed.get(agent_id, u64(0))
            self.failed[agent_id] = f + u64(1)

        q = self.quality_sum.get(agent_id, u64(0))
        self.quality_sum[agent_id] = q + quality_score

    # ---- Views ----
    @gl.public.view
    def get_admin(self) -> str:
        return self.admin.as_hex

    @gl.public.view
    def is_writer(self, addr: str) -> bool:
        return self._is_writer(Address(addr))

    @gl.public.view
    def get_reliability(self, agent_id: str) -> u64:
        total = self.total_tasks.get(agent_id, u64(0))
        if total == u64(0):
            return u64(50)
        s = self.successful.get(agent_id, u64(0))
        return (s * u64(100)) // total

    @gl.public.view
    def get_avg_quality(self, agent_id: str) -> u64:
        total = self.total_tasks.get(agent_id, u64(0))
        if total == u64(0):
            return u64(50)
        return self.quality_sum.get(agent_id, u64(0)) // total

    @gl.public.view
    def get_stats(self, agent_id: str) -> str:
        total = self.total_tasks.get(agent_id, u64(0))
        s = self.successful.get(agent_id, u64(0))
        f = self.failed.get(agent_id, u64(0))
        rel = self.get_reliability(agent_id)
        q = self.get_avg_quality(agent_id)
        return f"total={total},success={s},failed={f},reliability={rel},quality={q}"
