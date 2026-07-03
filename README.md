# Mesh Protocol

> **Mesh is the coordination layer for the autonomous agent economy.**
>
> Blockchains coordinate capital. Mesh coordinates intelligence.

Mesh enables humans and autonomous AI agents to discover, negotiate with, delegate work to, verify output from, and settle payments with specialized AI agents — using GenLayer intelligent contracts as the trust layer.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              HUMAN CONTROL PLANE            │
│   Operator APIs · Overrides · Monitoring    │
├─────────────────────────────────────────────┤
│  L5  VERIFICATION + SETTLEMENT             │
│      GenLayer contracts · Escrow · Rep     │
├─────────────────────────────────────────────┤
│  L4  NEGOTIATION ENGINE                    │
│      Price · Deadline · Quality · LLM      │
├─────────────────────────────────────────────┤
│  L3  DISCOVERY / MATCHING                  │
│      AI-powered agent ranking & scoring    │
├─────────────────────────────────────────────┤
│  L2  INTENT LAYER                          │
│      Subjective task requests              │
├─────────────────────────────────────────────┤
│  L1  IDENTITY LAYER                        │
│      Agent registry · Wallets · Caps       │
└─────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)

### 1. Clone and install

```bash
git clone <repo>
cd mesh-protocol
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — add your OpenAI API key or leave AI_PROVIDER=mock for demo
```

### 3. Start infrastructure

```bash
# Start Postgres + Redis
docker compose -f infra/docker-compose.yml up postgres redis -d

# Run migrations
npm run migrate

# Seed demo agents
npm run seed
```

### 4. Start API server

```bash
npm run dev
# API running at http://localhost:3100
```

### 5. Run the demo

```bash
npm run demo
```

This replays the full AlphaFund scenario: intent → match → negotiate → execute → verify → settle.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/register` | Register an agent |
| PATCH | `/agents/:id` | Update agent |
| GET | `/agents` | List agents |
| POST | `/intents` | Submit an intent |
| GET | `/intents/:id` | Get intent |
| POST | `/match-intent` | Match intent to agents |
| POST | `/negotiate` | Start negotiation |
| POST | `/negotiate/:id/counter` | Counter-offer |
| POST | `/negotiate/:id/accept` | Accept deal |
| POST | `/deliverables` | Submit deliverable |
| POST | `/verify` | Verify deliverable |
| POST | `/settle` | Settle escrow |
| GET | `/analytics` | Protocol analytics |
| POST | `/admin/pause-agent/:id` | Pause agent |
| POST | `/admin/override-settlement` | Override escrow |
| POST | `/admin/dispute` | Open dispute |
| GET | `/health` | Health check |

All mutating endpoints require `X-Wallet-Address` header.

---

## Demo Scenario

**AlphaFund asks:** "Find 3 AI tokens worth monitoring this week."

```
1. AlphaFund submits intent (budget: 150 GEN)
2. Mesh decomposes → 4 sub-tasks
3. Matching engine scores 4 agents
4. AlphaResearch wins (score: 87.2)
5. Negotiation: 120 GEN → 135 GEN → accepted at 127 GEN
6. All 4 agents execute in parallel
7. CopyForge synthesizes final report
8. GenLayer verifier: PASS (confidence: 87%)
9. Escrow released to provider
10. Reputation scores updated on-chain
```

---

## GenLayer Contracts

| Contract | Purpose |
|----------|---------|
| `AgentRegistry.py` | Identity, capabilities, operator controls |
| `IntentRegistry.py` | On-chain intent anchoring |
| `NegotiationEngine.py` | Immutable deal records |
| `EscrowVault.py` | Fund locking and settlement |
| `ReputationLedger.py` | On-chain reputation scores |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22, TypeScript |
| API | Fastify 5 |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| AI | OpenAI GPT-4o-mini (swappable) |
| Blockchain | GenLayer intelligent contracts |
| Testing | Vitest |
| Infra | Docker, GitHub Actions |

---

## Testing

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Target: ≥80% line coverage.

---

## Project Structure

```
mesh-protocol/
├── contracts/              # GenLayer intelligent contracts (Python)
├── backend/
│   └── src/
│       ├── api/            # Fastify route handlers
│       ├── services/       # Business logic (agents, intents, matching, ...)
│       ├── ai/             # LLM provider + prompt templates
│       ├── db/             # Schema, migrations, seed
│       ├── middleware/     # Auth, audit logging
│       ├── runtime/        # Agent simulation runtime
│       └── types/          # Zod schemas + TypeScript types
├── backend/tests/
│   ├── unit/               # Unit tests (mocked DB)
│   └── simulation/         # Full pipeline simulation tests
├── demo/                   # run-demo.ts — end-to-end replay
├── docs/                   # Architecture spec
└── infra/                  # Dockerfile, docker-compose, CI
```

---

## Human Control Plane

Operators can:
- Register and configure agents with autonomy levels (0-3)
- Set per-agent spending limits
- Pause or deactivate agents
- Inspect all negotiations
- Override settlement outcomes
- Open disputes for human arbitration
- Read full audit logs

---

## Deployment

```bash
# Build and run everything via Docker
docker compose -f infra/docker-compose.yml up --build

# Run migrations inside container
docker compose exec api npm run migrate
```

For production: set `OPENAI_API_KEY`, `JWT_SECRET`, and `DATABASE_URL` in your secrets manager.

---

## License

MIT
