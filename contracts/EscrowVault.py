# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
# Mesh Protocol -- Escrow Vault
# GenLayer Intelligent Contract
# Layer 5: Settlement
#
# NEGOTIATION_ENGINE_ADDRESS must be updated to the new NegotiationEngine
# address after each redeployment. Set this before deploying EscrowVault.

from genlayer import *

# UPDATE THIS after deploying NegotiationEngine
NEGOTIATION_ENGINE_ADDRESS = Address("0x2F6cba483F933aB2eEe0Fa2F69b9d511258A6172")

class EscrowVault(gl.Contract):
    """
    Holds funds in escrow between requester and provider.
    Cross-contract guard on release(): verifies negotiation was accepted
    on NegotiationEngine before transferring funds -- trustless enforcement.
    Human arbitration via resolve_dispute() for contested outcomes.
    """

    balances: TreeMap[str, u256]        # escrow_id -> amount (GEN wei)
    payers: TreeMap[str, Address]       # escrow_id -> payer
    payees: TreeMap[str, Address]       # escrow_id -> payee
    statuses: TreeMap[str, str]         # escrow_id -> locked|released|refunded|disputed
    intent_map: TreeMap[str, str]       # escrow_id -> intent_id
    negotiation_map: TreeMap[str, str]  # escrow_id -> negotiation_id

    # Enumeration index (DynArray not supported; TreeMap key must be str)
    escrow_count: u256
    escrow_index: TreeMap[str, str]     # str(index) -> escrow_id

    def __init__(self) -> None:
        self.escrow_count = u256(0)

    @gl.public.write.payable
    def lock(self, escrow_id: str, payee: str, intent_id: str, negotiation_id: str) -> None:
        """Lock msg.value into escrow. Called by requester after negotiation accepted."""
        assert escrow_id not in self.statuses, "Escrow already exists"
        assert gl.message.value > u256(0), "Must send GEN to lock"

        self.balances[escrow_id] = gl.message.value
        self.payers[escrow_id] = gl.message.sender_address
        self.payees[escrow_id] = Address(payee)
        self.statuses[escrow_id] = "locked"
        self.intent_map[escrow_id] = intent_id
        self.negotiation_map[escrow_id] = negotiation_id

        # Append to enumeration index
        idx = self.escrow_count
        self.escrow_index[str(int(idx))] = escrow_id
        self.escrow_count = idx + u256(1)

    @gl.public.write
    @allow_storage(NEGOTIATION_ENGINE_ADDRESS)
    def release(self, escrow_id: str) -> None:
        """
        Release funds to payee. Called after PASS verification.
        Cross-contract guard: verifies the linked negotiation is 'accepted'
        on NegotiationEngine before transferring -- trustless enforcement.
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
        """Flag for human arbitration."""
        assert self.statuses.get(escrow_id, "") == "locked", "Escrow not locked"
        self.statuses[escrow_id] = "disputed"

    @gl.public.write
    def resolve_dispute(self, escrow_id: str, release_to_payee: bool) -> None:
        """Human operator resolves disputed escrow via Arbitration Chamber."""
        assert self.statuses.get(escrow_id, "") == "disputed", "Not disputed"
        amount = self.balances[escrow_id]
        self.balances[escrow_id] = u256(0)

        if release_to_payee:
            self.statuses[escrow_id] = "released"
            gl.get_contract_at(self.payees[escrow_id]).emit_transfer(value=amount)
        else:
            self.statuses[escrow_id] = "refunded"
            gl.get_contract_at(self.payers[escrow_id]).emit_transfer(value=amount)

    # ---- Views ----

    @gl.public.view
    def get_escrow_count(self) -> u256:
        return self.escrow_count

    @gl.public.view
    def get_escrow_id_at(self, index: u256) -> str:
        return self.escrow_index.get(str(int(index)), "")

    @gl.public.view
    def get_escrow_data(self, escrow_id: str) -> str:
        """Returns pipe-delimited escrow data string for frontend parsing."""
        if escrow_id not in self.statuses:
            return ""
        status = self.statuses.get(escrow_id, "unknown")
        balance = int(self.balances.get(escrow_id, u256(0)))
        payer = self.payers[escrow_id].as_hex if escrow_id in self.payers else ""
        payee = self.payees[escrow_id].as_hex if escrow_id in self.payees else ""
        intent = self.intent_map.get(escrow_id, "")
        neg = self.negotiation_map.get(escrow_id, "")
        return f"status={status}|balance={balance}|payer={payer}|payee={payee}|intent={intent}|neg={neg}"

    @gl.public.view
    def get_status(self, escrow_id: str) -> str:
        return self.statuses.get(escrow_id, "unknown")

    @gl.public.view
    def get_balance(self, escrow_id: str) -> u256:
        return self.balances.get(escrow_id, u256(0))
