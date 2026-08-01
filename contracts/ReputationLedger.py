# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

# Mesh Protocol -- Reputation Ledger (Layer 5). Two ways to record an outcome:
#
# 1. report_from_escrow() -- PERMISSIONLESS. Anyone can call it; the outcome
#    isn't taken on the caller's word, it's derived by reading EscrowVault's
#    and NegotiationEngine's own state via cross-contract view() calls. This
#    is the trustless default path and requires no admin-appointed writer.
#
# 2. record_outcome() -- admin/authorized-writer only. Kept for cases needing
#    a nuanced quality score (e.g. partial credit) that the binary
#    released/refunded outcome can't express.
#
# Role-map keys are lowercased hex.


class ReputationLedger(gl.Contract):
    """
    On-chain immutable reputation scores.
    Written by anyone via report_from_escrow() (verified against real escrow
    state) or by an authorized writer via record_outcome(); readable by anyone.
    """

    # ---- roles ----
    admin: Address
    pending_admin: Address
    admin_transfer_pending: u64
    writers: TreeMap[str, u64]          # lowercased hex -> 1 if authorized

    # ---- dependencies (immutable; used only for permissionless verification) ----
    escrow_vault: Address
    negotiation_engine: Address

    # ---- reputation state ----
    total_tasks: TreeMap[str, u64]
    successful: TreeMap[str, u64]
    failed: TreeMap[str, u64]
    quality_sum: TreeMap[str, u64]      # sum of quality scores (0-100 each)

    # ---- de-dup guard for the permissionless path ----
    reported_escrows: TreeMap[str, u64] # escrow_id -> 1 if already reported

    def __init__(self, escrow_vault: str, negotiation_engine: str) -> None:
        self.admin = gl.message.sender_address
        self.escrow_vault = Address(escrow_vault)
        self.negotiation_engine = Address(negotiation_engine)

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

    # ---- admin transfer (two-step) ----
    @gl.public.write
    def propose_transfer_admin(self, new_admin: str) -> None:
        assert gl.message.sender_address == self.admin, "Only admin may propose a transfer"
        self.pending_admin = Address(new_admin)
        self.admin_transfer_pending = u64(1)

    @gl.public.write
    def confirm_transfer_admin(self) -> None:
        assert gl.message.sender_address == self.pending_admin, \
            "Only the proposed new admin may confirm"
        assert self.admin_transfer_pending == u64(1), "No transfer pending"
        self.admin = self.pending_admin
        self.admin_transfer_pending = u64(0)

    @gl.public.write
    def cancel_transfer_admin(self) -> None:
        assert gl.message.sender_address == self.admin, "Only admin may cancel"
        self.admin_transfer_pending = u64(0)

    # ---- internal outcome recorder (shared by both write paths) ----
    def _apply_outcome(self, agent_id: str, success: bool, quality_score: u64) -> None:
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

    # ---- reputation writes (authorized writers only) ----
    @gl.public.write
    def record_outcome(self, agent_id: str, success: bool, quality_score: u64) -> None:
        """Record task outcome with a nuanced quality score. Authorized writers only."""
        assert self._is_writer(gl.message.sender_address), "Unauthorized: not a reputation writer"
        assert quality_score <= u64(100), "Quality score must be 0-100"
        self._apply_outcome(agent_id, success, quality_score)

    # ---- permissionless, trustless reputation reporting ----
    @gl.public.write
    def report_from_escrow(self, escrow_id: str) -> None:
        """
        Anyone may call this. The outcome is never taken on the caller's word --
        it's derived by reading EscrowVault's own settled state (released or
        refunded) and NegotiationEngine's provider agent for that escrow's
        negotiation, both via cross-contract view() calls. This closes the gap
        where reputation only updated if a trusted, admin-appointed off-chain
        writer chose to call record_outcome() -- a dependency that could go
        stale or be exploited by omission (only reporting favorable outcomes).
        """
        assert escrow_id not in self.reported_escrows, "Already reported"

        vault = gl.get_contract_at(self.escrow_vault)
        status = vault.view().get_status(escrow_id)
        assert status in {"released", "refunded"}, "Escrow not settled"

        neg_id = vault.view().get_negotiation_id(escrow_id)
        assert neg_id != "", "Escrow has no linked negotiation"

        neg_engine = gl.get_contract_at(self.negotiation_engine)
        provider_id = neg_engine.view().get_provider(neg_id)
        assert provider_id != "", "Negotiation has no registered provider agent"

        success = status == "released"
        quality = u64(100) if success else u64(0)
        self._apply_outcome(provider_id, success, quality)
        self.reported_escrows[escrow_id] = u64(1)

    # ---- Views ----
    @gl.public.view
    def get_admin(self) -> str:
        return self.admin.as_hex

    @gl.public.view
    def is_writer(self, addr: str) -> bool:
        return self._is_writer(Address(addr))

    @gl.public.view
    def is_reported(self, escrow_id: str) -> bool:
        return escrow_id in self.reported_escrows

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
    def get_stats(self, agent_id: str) -> dict:
        return {
            "total": int(self.total_tasks.get(agent_id, u64(0))),
            "success": int(self.successful.get(agent_id, u64(0))),
            "failed": int(self.failed.get(agent_id, u64(0))),
            "reliability": int(self.get_reliability(agent_id)),
            "quality": int(self.get_avg_quality(agent_id)),
        }
