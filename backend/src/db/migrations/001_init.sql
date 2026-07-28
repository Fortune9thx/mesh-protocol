-- Mesh Protocol: Initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE agent_status AS ENUM ('active', 'paused', 'deactivated');
CREATE TYPE pricing_model AS ENUM ('per_task', 'per_hour', 'flat', 'auction');
CREATE TYPE intent_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE intent_status AS ENUM (
  'pending', 'matching', 'negotiating', 'in_progress',
  'delivered', 'verified', 'settled', 'cancelled', 'failed'
);
CREATE TYPE negotiation_status AS ENUM ('pending', 'counter', 'accepted', 'rejected', 'expired');
CREATE TYPE escrow_status AS ENUM ('locked', 'released', 'refunded', 'disputed');
CREATE TYPE verification_result AS ENUM ('PASS', 'FAIL', 'PARTIAL');

-- L1: Identity
CREATE TABLE agents (
  agent_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(120) NOT NULL,
  owner_wallet   VARCHAR(255) NOT NULL,
  category       VARCHAR(100) NOT NULL,
  capabilities   TEXT[] NOT NULL DEFAULT '{}',
  pricing_model  pricing_model NOT NULL DEFAULT 'per_task',
  base_price     NUMERIC(18,6) NOT NULL DEFAULT 0,
  availability   BOOLEAN NOT NULL DEFAULT true,
  reliability_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  confidence_score  NUMERIC(5,2) NOT NULL DEFAULT 50,
  endpoint_url   TEXT,
  status         agent_status NOT NULL DEFAULT 'active',
  autonomy_level INTEGER NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 3),
  spending_limit NUMERIC(18,6) NOT NULL DEFAULT 1000,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- L2: Intent
CREATE TABLE intents (
  intent_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester    VARCHAR(255) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  budget       NUMERIC(18,6) NOT NULL,
  deadline     TIMESTAMPTZ NOT NULL,
  priority     intent_priority NOT NULL DEFAULT 'medium',
  status       intent_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- L3: Matches
CREATE TABLE matches (
  match_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id        UUID NOT NULL REFERENCES intents(intent_id),
  agent_id         UUID NOT NULL REFERENCES agents(agent_id),
  score            NUMERIC(5,2) NOT NULL,
  capability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reputation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  cost_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  latency_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  rank             INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- L4: Negotiations
CREATE TABLE negotiations (
  negotiation_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id          UUID NOT NULL REFERENCES intents(intent_id),
  requester_agent    UUID NOT NULL REFERENCES agents(agent_id),
  provider_agent     UUID NOT NULL REFERENCES agents(agent_id),
  proposed_price     NUMERIC(18,6) NOT NULL,
  counter_price      NUMERIC(18,6),
  deadline           TIMESTAMPTZ NOT NULL,
  quality_threshold  NUMERIC(5,2) NOT NULL DEFAULT 80,
  confidence_guarantee NUMERIC(5,2) NOT NULL DEFAULT 70,
  status             negotiation_status NOT NULL DEFAULT 'pending',
  round              INTEGER NOT NULL DEFAULT 0,
  max_rounds         INTEGER NOT NULL DEFAULT 5,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- L5: Deliverables
CREATE TABLE deliverables (
  deliverable_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id      UUID NOT NULL REFERENCES intents(intent_id),
  provider_id    UUID NOT NULL REFERENCES agents(agent_id),
  content        TEXT NOT NULL,
  storage_hash   VARCHAR(255),
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- L5: Escrow
CREATE TABLE escrows (
  escrow_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id   UUID NOT NULL REFERENCES intents(intent_id),
  payer       VARCHAR(255) NOT NULL,
  payee       VARCHAR(255) NOT NULL,
  amount      NUMERIC(18,6) NOT NULL,
  status      escrow_status NOT NULL DEFAULT 'locked',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at  TIMESTAMPTZ
);

-- Reputation
CREATE TABLE reputations (
  agent_id         UUID PRIMARY KEY REFERENCES agents(agent_id),
  total_tasks      INTEGER NOT NULL DEFAULT 0,
  successful_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks     INTEGER NOT NULL DEFAULT 0,
  avg_quality      NUMERIC(5,2) NOT NULL DEFAULT 50,
  avg_speed        NUMERIC(5,2) NOT NULL DEFAULT 50,
  reliability_score NUMERIC(5,2) NOT NULL DEFAULT 50,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  event_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  VARCHAR(60) NOT NULL,
  entity_id   VARCHAR(255) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  log_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor       VARCHAR(255) NOT NULL,
  action      VARCHAR(120) NOT NULL,
  entity_id   VARCHAR(255),
  entity_type VARCHAR(60),
  details     JSONB NOT NULL DEFAULT '{}',
  ip_address  VARCHAR(45),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_category ON agents(category);
CREATE INDEX idx_intents_status ON intents(status);
CREATE INDEX idx_intents_requester ON intents(requester);
CREATE INDEX idx_matches_intent ON matches(intent_id);
CREATE INDEX idx_negotiations_intent ON negotiations(intent_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);
CREATE INDEX idx_escrows_intent ON escrows(intent_id);
CREATE INDEX idx_escrows_status ON escrows(status);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_entity ON events(entity_id, entity_type);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
