# Mesh Protocol

> **Blockchains coordinate capital. Mesh coordinates intelligence.**

---

## The Idea

I've been watching the AI agent space for a while. Tools like AutoGPT, CrewAI, LangGraph — they all solve a narrow slice of the problem: how do you get one model to reason in a loop, or how do you get two models to talk to each other. But none of them answer the question I kept coming back to:

**What happens when AI agents need to transact with each other at scale?**

Not pass messages. Not share context. Actually *transact* — hire each other, pay each other, dispute each other, build reputation with each other. The way humans do in a market.

The internet gave us a global marketplace for information. Blockchains gave us a global marketplace for capital. I think we're at the start of a third layer: **a global marketplace for intelligence**. Where an orchestrator agent running a hedge fund at 3am can autonomously source a research agent, negotiate a price, verify the deliverable, release payment, and update its trust score — all without a human in the loop.

Mesh is the infrastructure for that.

It's not a chatbot framework. It's not a workflow engine. It's a **coordination protocol** — the stack of rules, contracts, and services that lets autonomous AI agents find each other, agree on terms, do work, settle value, and build reputations over time.

The thesis: the bottleneck in the autonomous agent economy won't be model capability. It'll be **trust infrastructure**. Mesh is that infrastructure.

---

## Architecture

The protocol is organised into five layers, each one building on the last. This wasn't arbitrary — it came from thinking about what a human marketplace actually does and stripping it down to its minimum viable primitives.

```
┌─────────────────────────────────────────────────────┐
│                 HUMAN CONTROL PLANE                  │
│     Operator APIs · Overrides · Monitoring          │
├─────────────────────────────────────────────────────┤
│  L5  VERIFICATION + SETTLEMENT                      │
│      GenLayer intelligent contracts · Escrow · Rep  │
├─────────────────────────────────────────────────────┤
│  L4  NEGOTIATION ENGINE                             │
│      Price · Deadline · Quality · LLM arbitration   │
├─────────────────────────────────────────────────────┤
│  L3  DISCOVERY / MATCHING                           │
│      AI-powered agent ranking and scoring           │
├─────────────────────────────────────────────────────┤
│  L2  INTENT LAYER                                   │
│      Subjective task requests + decomposition       │
├─────────────────────────────────────────────────────┤
│  L1  IDENTITY LAYER                                 │
│      Agent registry · Wallets · Capabilities · Caps │
└─────────────────────────────────────────────────────┘
```

**L1 — Identity.** Every agent has a wallet address, a set of capabilities, an autonomy level (0–3), and a spending cap. These are anchored on-chain via `AgentRegistry.py`. The backend is the authoritative source for live queries; the chain is the immutable audit record.

**L2 — Intent.** Requesters submit natural language intents with a budget and deadline. The system decomposes them into sub-tasks. These are anchored on `IntentRegistry.py`.

**L3 — Matching.** An LLM-powered scoring engine ranks registered agents against a decomposed intent using a composite formula: `capability_match × 0.4 + reputation × 0.25 + cost_efficiency × 0.2 + latency × 0.15`.

**L4 — Negotiation.** The top candidates enter an automated price/deadline/quality negotiation loop. Counteroffers are handled by the LLM. Accepted deals are recorded immutably on `NegotiationEngine.py`.

**L5 — Verification + Settlement.** When an agent delivers, an LLM verifier scores the output (PASS / PARTIAL / FAIL). PASS → escrow released to provider. FAIL → refund to requester. PARTIAL → human arbitration queue. Reputation scores updated on `ReputationLedger.py`.

**Human Control Plane.** Operators can pause agents, override settlements, open disputes, raise spend caps, and read full audit logs at any time. The protocol is autonomous by default but human-overridable by design.

---

## The Build

### Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22, TypeScript |
| API | Fastify 5 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| AI | OpenAI GPT-4o-mini (mock-swappable) |
| Blockchain | GenLayer intelligent contracts (Python) |
| Auth | EIP-191 challenge–response + JWT |
| Frontend | Next.js 16, Tailwind v4, Framer Motion |
| Testing | Vitest — 36 tests |
| Infra | Docker, GitHub Actions |

### What's Deployed

All five intelligent contracts are live on **GenLayer Bradbury Testnet**:

| Contract | Address |
|---|---|
| `AgentRegistry.py` | `0xB31900eE7fa37E7e8a2cd49212125e49efdBEa2c` |
| `IntentRegistry.py` | `0x4a2CB695c015F4198627135249a093425a5080e8` |
| `NegotiationEngine.py` | `0xa5C8cd99d081145ef90dDEEC024665CaA21E86C7` |
| `EscrowVault.py` | `0x7Db590E16F1F2E40d0859379b2706fc539db5d65` |
| `ReputationLedger.py` | `0xfA8912C4AA206DdAD7496Cf3df5B6A64AF1e5982` |

Deployer: `0x00f42f7ad0edbd0818bd46c8e51cdb5670dde6d9`

---

## The Interface

Three surfaces. One operator viewport.

### OVR — Protocol Overview

The live topology of the mesh. Orchestrator and sub-agent nodes, edge states (active / negotiating / dispute), simulation controls, governance alerts, and a real-time event stream. Everything happening on the protocol, visible at a glance.

![Protocol Overview — Live Topology](docs/screenshots/ovr.png)

### CON — Human Control Console

The operator's cockpit. Full agent registry with trust scores and spend data. Wallet balances, permission states, and the dispute queue. Everything you need to govern the protocol without touching the contracts directly.

![Control Console](docs/screenshots/con.png)

### WRK — Agent Workbench

Deep inspection of a single agent. Trust score, load, confidence, registered capabilities, full reasoning trace, and complete negotiation history. When something goes wrong, this is where you diagnose it.

![Agent Workbench](docs/screenshots/wrk.png)

---

## What I Ran Into

This section is the honest version. The things that didn't work before they worked.

### 1. GenLayer storage type constraints — the silent failure

Every single deployment of `AgentRegistry.py` returned `FINISHED_WITH_ERROR`. No exception, no revert message. Just a silent deterministic failure.

The initial contract used:

```python
agents: TreeMap[str, DynArray[str]]   # agent_id -> list of capabilities
autonomy_levels: TreeMap[str, u8]     # agent_id -> 0-3
```

I spent time ruling out the network — other people's contracts were deploying fine. I ruled out the pragma — the bytecode hash was correct. Then I decoded the transaction receipt directly and found `eqBlocksOutputs: '0xc786706164646564'`. Decoded from RLP: `["padded"]`. A deterministic storage schema validation failure, not a runtime error.

The GenLayer Bradbury storage engine only accepts `str`, `u64`, `u256`, and `Address` as TreeMap value types. Nested generics (`DynArray` as a value type) and `u8` both fail silently at schema validation time, before any Python runs.

The fix was straightforward once I understood the constraint — flatten capabilities to a comma-separated `str`, change `u8` to `u64`. But diagnosing it required decoding raw RLP from a receipt field that most tools don't surface.

```python
# Before — fails silently
agents: TreeMap[str, DynArray[str]]
autonomy_levels: TreeMap[str, u8]

# After — deploys correctly
agents: TreeMap[str, str]        # "market_intelligence,sentiment_analysis"
autonomy_levels: TreeMap[str, u64]
```

### 2. Vitest mock hoisting race — a subtle async timing issue

One test in `auth-ownership.test.ts` was consistently timing out at 5 seconds: *"rejects update from a wallet that does not own the agent"*. Every other test in the same file passed.

The root cause: `vi.mock()` calls are hoisted by Vitest to the top of the file before imports — but the hoisting is synchronous, while Fastify's plugin registration is async. When `buildApp()` registered `analyticsRoutes`, which imports `settlement.ts`, which imports `genlayer/client.ts`, the `import "dotenv/config"` at the top of `client.ts` triggered a side effect during Fastify's async plugin initialization. This created a race condition on the first test, preventing `app.ready()` from ever resolving.

The fix: add an explicit `vi.mock("../../src/genlayer/client.js", () => ({...}))` with stubs for all five contract objects. Mock the full dependency chain, not just the modules you think your test touches directly.

### 3. The `@allow_storage` trustless escrow gap

The original EscrowVault had no on-chain verification that a release corresponded to an accepted negotiation. It trusted the backend wallet to gate it correctly. That's fine for a demo. For production, it means a compromised backend key could release any escrow without a valid on-chain deal record.

The production version of `EscrowVault.py` uses `@allow_storage(NEGOTIATION_ENGINE_ADDRESS)` to read NegotiationEngine state cross-contract and assert `status == "accepted"` before transferring funds. This closes the loop — the trustless enforcement lives on-chain, not in the backend.

```python
@gl.public.write
@allow_storage(NEGOTIATION_ENGINE_ADDRESS)
def release(self, escrow_id: str) -> None:
    neg_id = self.negotiation_map.get(escrow_id, "")
    if neg_id:
        neg_engine = gl.get_contract_at(NEGOTIATION_ENGINE_ADDRESS)
        neg_status = neg_engine.get_status(neg_id)
        assert neg_status == "accepted", f"Negotiation not accepted (status: {neg_status})"
    ...
```

`@allow_storage` requires a Bradbury version that supports it. EscrowVault is flagged for redeployment when that lands.

### 4. Wallet auth was just a header check

The first version of `walletAuth` checked that `X-Wallet-Address` existed and was longer than 10 characters. Anyone could forge it. The frontend had a `DEMO_WALLET` constant baked in.

Production auth is EIP-191 challenge–response:

1. `GET /auth/challenge?wallet=0x...` — server generates a one-time nonce, stores it with a 5-minute TTL
2. Frontend calls `personal_sign` — MetaMask prompts the user to sign the challenge message
3. `POST /auth/verify` — server uses viem's `verifyMessage()` to ecrecover the signer and compare against the claimed wallet
4. On success: server issues a 24h JWT. All subsequent API calls use `Authorization: Bearer <token>`

In dev and test, `X-Wallet-Address` is still accepted as a fallback so existing tests don't break. In production (`NODE_ENV=production`), JWT is required — no exceptions.

### 5. The keystore capital-C `Crypto` field

When decrypting the Web3 keystore to extract the deployer private key, the standard tooling expects lowercase `crypto`. The exported keystore had `Crypto` (capital C) — the geth/Web3 format. Every library silently returned undefined.

Had to write a manual Node.js decryption script using `scrypt` + `createDecipheriv("aes-128-ctr")` and access `ks.Crypto` directly. Small issue, significant diagnostic time.

---

## The Demo Scenario

**AlphaFund asks:** *"Find 3 AI tokens worth monitoring this week."*

```
1.  AlphaFund submits intent         budget: 150 GEN
2.  Mesh decomposes                  → 4 sub-tasks
3.  Matching engine scores agents    AlphaResearch wins (score: 87.2)
4.  Escrow locked                    150 GEN held
5.  Negotiation opens                requester proposes 120 GEN
6.  Provider counters                135 GEN
7.  Compromise resolved              accepted at 127 GEN
8.  Agents execute in parallel       AlphaResearch, WalletIntel, RiskLens, CopyForge
9.  Deliverable submitted
10. GenLayer verifier                PASS — confidence 87%
11. Escrow released                  127 GEN to provider
12. Reputation updated               on-chain, immutable
```

Run it locally:

```bash
npm run demo
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- Docker + Docker Compose
- PostgreSQL 16 (or use the Docker Compose file)

### 1. Install

```bash
git clone https://github.com/yourusername/mesh-protocol
cd mesh-protocol
npm install
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp .env.example .env
# Required: DATABASE_URL, JWT_SECRET (generate with the command in .env.example)
# For live LLM: set AI_PROVIDER=openai and add OPENAI_API_KEY
# For GenLayer writes: set GENLAYER_PRIVATE_KEY
```

### 3. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up postgres redis -d
npm run migrate
npm run seed
```

### 4. Run the API

```bash
npm run dev
# → http://localhost:3100
# → http://localhost:3100/docs  (Swagger UI)
```

### 5. Run the frontend

```bash
cd frontend && npm run dev
# → http://localhost:3000
```

### 6. Run the demo

```bash
npm run demo
```

### 7. Run tests

```bash
npm test                 # 36 tests
npm run test:coverage    # with coverage report
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/auth/challenge` | — | Get EIP-191 sign challenge for wallet |
| POST | `/auth/verify` | — | Verify signature, receive JWT |
| POST | `/agents/register` | JWT | Register an agent |
| PATCH | `/agents/:id` | JWT | Update agent (owner only) |
| GET | `/agents` | — | List all agents |
| POST | `/intents` | JWT | Submit an intent |
| GET | `/intents/:id` | — | Get intent |
| POST | `/match-intent` | — | Match intent to top agents |
| POST | `/negotiate` | JWT | Start negotiation |
| POST | `/negotiate/:id/counter` | JWT | Counter-offer |
| POST | `/negotiate/:id/accept` | JWT | Accept deal |
| POST | `/deliverables` | JWT | Submit deliverable |
| POST | `/verify` | JWT | Verify deliverable (LLM) |
| POST | `/settle` | JWT | Settle escrow |
| GET | `/analytics` | — | Protocol analytics |
| POST | `/admin/pause-agent/:id` | JWT (operator) | Pause agent |
| POST | `/admin/override-settlement` | JWT (operator) | Override escrow |
| POST | `/admin/dispute` | JWT (operator) | Open dispute |
| GET | `/events/stream` | — | SSE live event stream |
| GET | `/health` | — | Health check |

All mutating endpoints require `Authorization: Bearer <token>`. Operator endpoints additionally require the wallet to own at least one registered agent.

---

## Project Structure

```
mesh-protocol/
├── contracts/                  # GenLayer intelligent contracts (Python)
│   ├── AgentRegistry.py
│   ├── IntentRegistry.py
│   ├── NegotiationEngine.py
│   ├── EscrowVault.py          # @allow_storage guard for trustless release
│   └── ReputationLedger.py
├── backend/
│   └── src/
│       ├── api/                # Fastify route handlers
│       │   ├── auth.ts         # EIP-191 challenge + JWT issuance
│       │   ├── agents.ts
│       │   ├── intents.ts
│       │   ├── matching.ts
│       │   ├── negotiation.ts
│       │   ├── deliverables.ts
│       │   └── analytics.ts
│       ├── services/           # Business logic
│       ├── ai/                 # LLM provider + prompt templates
│       ├── db/                 # Schema, migrations, seed
│       ├── middleware/         # JWT auth, audit logging
│       ├── genlayer/           # On-chain write/read client (genlayer-js)
│       ├── runtime/            # Agent simulation (4 demo agents)
│       └── types/              # Zod schemas + TypeScript types
├── backend/tests/
│   ├── unit/                   # Unit tests (mocked DB + GenLayer)
│   └── simulation/             # Full pipeline simulation tests
├── frontend/
│   ├── app/                    # Next.js app router
│   ├── components/
│   │   ├── shell/              # TopBar, LeftRail, BottomTicker
│   │   ├── surfaces/           # OVR, CON, WRK views
│   │   ├── topology/           # Live topology SVG renderer
│   │   ├── modals/             # Register, Arbitrate, FundWallet
│   │   └── primitives/         # MetricBar, StatusChip, etc.
│   └── lib/                    # WalletProvider, API client, hooks
├── demo/                       # run-demo.ts — end-to-end AlphaFund replay
├── docs/                       # Architecture spec + screenshots
└── infra/                      # Dockerfile, docker-compose, CI
```

---

## Production Checklist

| Item | Status |
|---|---|
| EIP-191 wallet signature verification | ✅ |
| JWT auth on all mutating endpoints | ✅ |
| MetaMask / injected wallet connection | ✅ |
| Production startup guard (refuses to start with default secrets) | ✅ |
| Fire-and-forget on-chain writes (DB is source of truth) | ✅ |
| `@allow_storage` trustless escrow guard | ✅ code ready — redeploy when Bradbury supports it |
| Audit log on every state mutation | ✅ |
| Rate limiting | ✅ |
| Swagger docs | ✅ `/docs` |
| 36 tests (unit + simulation) | ✅ |
| AI provider swappable (mock ↔ OpenAI) | ✅ |

---

## What's Next

- **`@allow_storage` redeployment** — EscrowVault redeployment once GenLayer Bradbury confirms support for cross-contract storage reads
- **Mainnet migration** — swap Bradbury RPC for GenLayer mainnet, rotate deployer key
- **Agent SDK** — a TypeScript SDK so external teams can register agents and subscribe to intents programmatically
- **Intent decomposition V2** — structured sub-task graph instead of flat decomposition
- **Spending limit enforcement on-chain** — currently backend-enforced only

---

## License

MIT

---

*Built on GenLayer — intelligent contracts that run Python with LLM access natively on-chain.*
