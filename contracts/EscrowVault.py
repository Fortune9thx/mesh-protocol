# { "Depends": "py-genlayer:test" }
# Mesh Protocol — Escrow Vault
# GenLayer Intelligent Contract
# Layer 5: Settlement

from genlayer import *

class EscrowVault(gl.Contract):
    """
    Holds funds in escrow between requester and provider.
    Releases, refunds, or disputes based on verification result.
    """

    # escrow_id -> amount (GEN wei)
    balances: TreeMap[str, u256]
    # escrow_id -> payer address
    payers: TreeMap[str, str]
    # escrow_id -> payee address
    payees: TreeMap[str, str]
    # escrow_id -> status: locked|released|refunded|disputed
    statuses: TreeMap[str, str]
    # escrow_id -> intent_id
    intent_map: TreeMap[str, str]

    def __init__(self) -> None:
        self.balances = TreeMap()
        self.payers = TreeMap()
        self.payees = TreeMap()
        self.statuses = TreeMap()
        self.intent_map = TreeMap()

    @gl.public.write
    def lock(self, escrow_id: str, payee: str, intent_id: str) -> None:
        """Lock msg.value into escrow. Called by requester."""
        assert escrow_id not in self.statuses, "Escrow already exists"
        assert gl.message.value > u256(0), "Must send GEN to lock"

        self.balances[escrow_id] = gl.message.value
        self.payers[escrow_id] = gl.message.sender_address
        self.payees[escrow_id] = payee
        self.statuses[escrow_id] = "locked"
        self.intent_map[escrow_id] = intent_id

    @gl.public.write
    def release(self, escrow_id: str) -> None:
        """Release funds to payee. Called after PASS verification."""
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"
        amount = self.balances[escrow_id]
        payee = self.payees[escrow_id]

        self.statuses[escrow_id] = "released"
        self.balances[escrow_id] = u256(0)

        # Transfer to provider
        gl.message.send_tokens(payee, amount)

    @gl.public.write
    def refund(self, escrow_id: str) -> None:
        """Refund to payer. Called after FAIL verification."""
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"
        amount = self.balances[escrow_id]
        payer = self.payers[escrow_id]

        self.statuses[escrow_id] = "refunded"
        self.balances[escrow_id] = u256(0)

        gl.message.send_tokens(payer, amount)

    @gl.public.write
    def dispute(self, escrow_id: str) -> None:
        """Flag for human arbitration. Called after PARTIAL verification."""
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"
        self.statuses[escrow_id] = "disputed"

    @gl.public.write
    def resolve_dispute(self, escrow_id: str, release_to_payee: bool) -> None:
        """Human operator resolves disputed escrow."""
        assert self.statuses.get(escrow_id, "") == "disputed", "Not disputed"
        amount = self.balances[escrow_id]
        self.balances[escrow_id] = u256(0)

        if release_to_payee:
            self.statuses[escrow_id] = "released"
            gl.message.send_tokens(self.payees[escrow_id], amount)
        else:
            self.statuses[escrow_id] = "refunded"
            gl.message.send_tokens(self.payers[escrow_id], amount)

    @gl.public.view
    def get_status(self, escrow_id: str) -> str:
        return self.statuses.get(escrow_id, "unknown")

    @gl.public.view
    def get_balance(self, escrow_id: str) -> u256:
        return self.balances.get(escrow_id, u256(0))
