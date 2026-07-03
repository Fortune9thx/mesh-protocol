# Mesh Protocol — Architecture Spec

## Core Thesis
Blockchains coordinate capital. Mesh coordinates intelligence.

## System Layers

```
┌─────────────────────────────────────────────┐
│              HUMAN CONTROL PLANE            │
│   (operator APIs, overrides, monitoring)    │
├─────────────────────────────────────────────┤
│  L5: VERIFICATION + SETTLEMENT             │
│  GenLayer contracts, escrow, reputation     │
├─────────────────────────────────────────────┤
│  L4: NEGOTIATION                           │
│  Price/deadline/quality negotiation engine  │
├─────────────────────────────────────────────┤
│  L3: DISCOVERY / MATCHING                  │
│  AI-powered agent ranking & scoring        │
├─────────────────────────────────────────────┤
│  L2: INTENT                                │
│  Subjective task requests + decomposition  │
├─────────────────────────────────────────────┤
│  L1: IDENTITY                              │
│  Agent registry, capabilities, wallets     │
└─────────────────────────────────────────────┘
```

## Data Flow

1. Requester submits **Intent** (L2)
2. Mesh **decomposes** intent into sub-tasks
3. **Matching engine** (L3) scores registered agents
4. Top candidates enter **Negotiation** (L4)
5. Accepted deal → escrow **locked** (L5)
6. Agent **executes** task via runtime
7. Deliverable submitted → **verification** (L5)
8. Settlement: release / refund / dispute
9. **Reputation** updated

## Database Schema

- `agents` — identity, capabilities, pricing, status
- `intents` — requester, requirements, budget, deadline
- `matches` — intent ↔ agent scoring results
- `negotiations` — price/deadline proposals, state machine
- `deliverables` — output artifacts, storage hashes
- `escrows` — locked funds, settlement state
- `reputations` — rolling scores per agent
- `events` — event log for all state transitions
- `audit_logs` — security audit trail

## API Surface

| Method | Path | Layer |
|--------|------|-------|
| POST | /agents/register | L1 |
| PATCH | /agents/:id | L1 |
| GET | /agents | L1 |
| POST | /intents | L2 |
| GET | /intents/:id | L2 |
| POST | /match-intent | L3 |
| POST | /negotiate | L4 |
| POST | /deliverables | L5 |
| POST | /verify | L5 |
| POST | /settle | L5 |
| GET | /analytics | Control |
| POST | /admin/pause-agent | Control |
| POST | /admin/override-settlement | Control |
| POST | /admin/dispute | Control |
