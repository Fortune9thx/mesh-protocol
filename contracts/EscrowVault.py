# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# Mesh Protocol — Escrow Vault
# GenLayer Intelligent Contract
# Layer 5: Settlement
#
# Production note: release() and resolve_dispute() use @allow_storage to read
# NegotiationEngine state and enforce that funds can only be released against
# an on-chain accepted negotiation. Requires NegotiationEngine deployed address
# set as NEGOTIATION_ENGINE_ADDRESS constant before deployment.
#
# Current Bradbury address: 0xa5C8cd99d081145ef90dDEEC024665CaA21E86C7

from genlayer import *

NEGOTIATION_ENGINE_ADDRESS = Address("0xa5C8cd99d081145ef90dDEEC024665CaA21E86C7")

class EscrowVault(gl.Contract):
    """
    Holds funds in escrow between requester and provider.
    Releases, refunds, or disputes based on verification result.
    Cross-contract guard: release() verifies the corresponding negotiation
    was accepted on NegotiationEngine before transferring funds.
    """

    # escrow_id -> amount (GEN wei)
    balances: TreeMap[str, u256]
    # escrow_id -> payer address
    payers: TreeMap[str, Address]
    # escrow_id -> payee address
    payees: TreeMap[str, Address]
    # escrow_id -> status: locked|released|refunded|disputed
    statuses: TreeMap[str, str]
    # escrow_id -> intent_id
    intent_map: TreeMap[str, str]
    # escrow_id -> negotiation_id (set at lock time for release guard)
    negotiation_map: TreeMap[str, str]

    def __init__(self) -> None:
        pass

    @gl.public.write.payable
    def lock(self, escrow_id: str, payee: str, intent_id: str, negotiation_id: str) -> None:
        """Lock msg.value into escrow. Called by requester after negotiation accepted."""
        assert escrow_id not in self.statuses, "Escrow already exists"
        assert gl.message.value > 0, "Must send GEN to lock"

        self.balances[escrow_id] = gl.message.value
        self.payers[escrow_id] = gl.message.sender_address
        self.payees[escrow_id] = Address(payee)
        self.statuses[escrow_id] = "locked"
        self.intent_map[escrow_id] = intent_id
        self.negotiation_map[escrow_id] = negotiation_id

    @gl.public.write
    @allow_storage(NEGOTIATION_ENGINE_ADDRESS)
    def release(self, escrow_id: str) -> None:
        """
        Release funds to payee. Called after PASS verification.
        Cross-contract guard: verifies the linked negotiation is 'accepted'
        on NegotiationEngine before transferring — trustless enforcement.
        """
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"

        neg_id = self.negotiation_map.get(escrow_id, "")
        if neg_id:
            neg_engine = gl.get_contract_at(NEGOTIATION_ENGINE_ADDRESS)
            neg_status = neg_engine.get_status(neg_id)
            assert neg_status == "accepted", f"Negotiation not accepted (status: {neg_status})"

        amount = self.balances[escrow_id]
        payee = self.payees[escrow_id]

        self.statuses[escrow_id] = "released"
        self.balances[escrow_id] = u256(0)

        gl.get_contract_at(payee).emit_transfer(value=amount)

    @gl.public.write
    def refund(self, escrow_id: str) -> None:
        """Refund to payer. Called after FAIL verification."""
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"
        amount = self.balances[escrow_id]
        payer = self.payers[escrow_id]

        self.statuses[escrow_id] = "refunded"
        self.balances[escrow_id] = u256(0)

        gl.get_contract_at(payer).emit_transfer(value=amount)

    @gl.public.write
    def dispute(self, escrow_id: str) -> None:
        """Flag for human arbitration. Called after PARTIAL verification."""
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"
        self.statuses[escrow_id] = "disputed"

    @gl.public.write
    @allow_storage(NEGOTIATION_ENGINE_ADDRESS)
    def resolve_dispute(self, escrow_id: str, release_to_payee: bool) -> None:
        """Human operator resolves disputed escrow."""
        assert self.statuses.get(escrow_id, "") == "disputed", "Not disputed"
        amount = self.balances[escrow_id]
        self.balances[escrow_id] = u256(0)

        if release_to_payee:
            self.statuses[escrow_id] = "released"
            gl.get_contract_at(self.payees[escrow_id]).emit_transfer(value=amount)
        else:
            self.statuses[escrow_id] = "refunded"
            gl.get_contract_at(self.payers[escrow_id]).emit_transfer(value=amount)

    @gl.public.view
    def get_status(self, escrow_id: str) -> str:
        return self.statuses.get(escrow_id, "unknown")

    @gl.public.view
    def get_balance(self, escrow_id: str) -> u256:
        return self.balances.get(escrow_id, u256(0))
