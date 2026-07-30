/**
 * Mesh Protocol -- Contract Deployment Script
 * Deploys all 5 intelligent contracts to GenLayer Bradbury testnet in order.
 *
 * Usage:
 *   node scripts/deploy-contracts.mjs
 *
 * Requires GENLAYER_PRIVATE_KEY in .env (root or backend/.env).
 *
 * Deployment order (dependency chain):
 *   1. AgentRegistry
 *   2. IntentRegistry
 *   3. NegotiationEngine
 *   4. EscrowVault        (constructor receives NegotiationEngine address)
 *   5. ReputationLedger
 *
 * After completion, copy the printed addresses into:
 *   - frontend/lib/contracts.ts  (CONTRACT_ADDRESSES)
 *   - backend/src/genlayer/client.ts  (CONTRACT_ADDRESSES)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Load env
const envPath = path.join(ROOT, "backend", ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

const PRIVATE_KEY = process.env.GENLAYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: GENLAYER_PRIVATE_KEY not set in backend/.env");
  process.exit(1);
}

const { createClient, createAccount } = await import("genlayer-js");
const chains = await import("genlayer-js/chains");

// Target network is configurable: MESH_NETWORK=studionet|bradbury|asimov|localnet
const NETWORK_KEY = (process.env.MESH_NETWORK ?? "bradbury").toLowerCase();
const CHAIN_BY_KEY = {
  studionet: chains.studionet,
  bradbury: chains.testnetBradbury,
  asimov: chains.testnetAsimov,
  localnet: chains.localnet,
};
const chain = CHAIN_BY_KEY[NETWORK_KEY];
if (!chain) {
  console.error(`ERROR: unknown MESH_NETWORK "${NETWORK_KEY}". Use: ${Object.keys(CHAIN_BY_KEY).join(", ")}`);
  process.exit(1);
}

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain, account });
console.log(`Network: ${chain.name} (chain ${chain.id})`);

/**
 * A deploy transaction reaching ACCEPTED/FINALIZED does NOT prove the contract
 * code persisted — some networks record the tx but never serve the code. Read a
 * view method to confirm the contract is actually live before moving on.
 */
async function verifyDeployed(name, address, viewFn, args = []) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      await client.readContract({ address, functionName: viewFn, args });
      console.log(`  ${name}: verified readable`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  console.warn(`  ${name}: WARNING deployed but not readable yet (${address})`);
  return false;
}

async function submitWithRetry(fn, label, tries = 10) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message ?? err);
      // Rate limits are hourly — retrying in-process just burns the budget.
      // Fail fast with a clear instruction instead.
      if (msg.includes("Rate limit exceeded") || msg.includes("-32029")) {
        const secs = err?.cause?.data?.retry_after_seconds;
        console.error(
          `\n  ${label}: RPC rate limit reached.` +
            (secs ? ` Retry in ~${Math.ceil(secs / 60)} min.` : "") +
            `\n  Re-run this script when the window resets; already-deployed` +
            ` addresses are printed above.\n`,
        );
        throw err;
      }
      const transient =
        msg.includes("backpressure") ||
        msg.includes("not currently accepting") ||
        msg.includes("internal error") ||
        msg.includes("-32603") ||
        msg.includes("was reverted") || // intermittent consensus-contract revert under load
        msg.includes("Timed out"); // receipt not ACCEPTED yet under load — keep polling
      if (!transient || attempt === tries) throw err;
      const wait = Math.min(20000, 5000 * attempt);
      console.log(`  ${label}: node busy (attempt ${attempt}/${tries}) — retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function deployContract(name, codePath, arguments_ = []) {
  console.log(`\nDeploying ${name}...`);
  const code = fs.readFileSync(codePath, "utf8").replace(/\r\n/g, "\n");
  try {
    const tx = await submitWithRetry(
      () => client.deployContract({ code, args: arguments_.length ? arguments_ : [], leaderOnly: false }),
      name,
    );
    console.log(`  tx: ${tx}`);

    // Wait for ACCEPTED (leaders agreed), then extract contract address
    const receipt = await submitWithRetry(
      () => client.waitForTransactionReceipt({ hash: tx, status: "ACCEPTED" }),
      `${name} receipt`,
    );

    // genlayer-js receipt: contractAddress lives in txDataDecoded
    const address =
      receipt?.txDataDecoded?.contractAddress ??
      receipt?.data?.contract_address ??
      receipt?.contractAddress ??
      receipt?.contract_address ??
      "UNKNOWN";

    if (address === "UNKNOWN") {
      const safeStr = JSON.stringify(receipt, (_, v) => typeof v === "bigint" ? v.toString() : v, 2);
      console.log(`  receipt dump:`, safeStr);
    }

    console.log(`  ${name}: ${address}`);

    // Brief pause between deploys to avoid nonce collisions
    await new Promise((r) => setTimeout(r, 3000));
    return address;
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    throw err;
  }
}

console.log("=== Mesh Protocol Contract Deployment ===");
console.log(`Account: ${account.address ?? "(derived from key)"}`);

const addresses = {};

// 1. AgentRegistry
addresses.AgentRegistry = await deployContract(
  "AgentRegistry",
  path.join(ROOT, "contracts", "AgentRegistry.py"),
);
await verifyDeployed("AgentRegistry", addresses.AgentRegistry, "get_agent_count");

// 2. IntentRegistry
addresses.IntentRegistry = await deployContract(
  "IntentRegistry",
  path.join(ROOT, "contracts", "IntentRegistry.py"),
);
await verifyDeployed("IntentRegistry", addresses.IntentRegistry, "get_intent_count");

// 3. NegotiationEngine
addresses.NegotiationEngine = await deployContract(
  "NegotiationEngine",
  path.join(ROOT, "contracts", "NegotiationEngine.py"),
);
await verifyDeployed("NegotiationEngine", addresses.NegotiationEngine, "get_neg_count");

// 4. EscrowVault -- pass NegotiationEngine address as constructor arg
addresses.EscrowVault = await deployContract(
  "EscrowVault",
  path.join(ROOT, "contracts", "EscrowVault.py"),
  [addresses.NegotiationEngine],
);
await verifyDeployed("EscrowVault", addresses.EscrowVault, "get_escrow_count");

// 5. ReputationLedger
addresses.ReputationLedger = await deployContract(
  "ReputationLedger",
  path.join(ROOT, "contracts", "ReputationLedger.py"),
);
await verifyDeployed("ReputationLedger", addresses.ReputationLedger, "get_admin");

// Output results
console.log("\n\n=== DEPLOYED ADDRESSES ===");
for (const [name, addr] of Object.entries(addresses)) {
  console.log(`${name.padEnd(20)}: ${addr}`);
}

// Write both a network-scoped file (so several networks can coexist) and the
// active addresses.json the frontend/tests read.
const payload = { network: NETWORK_KEY, chainId: chain.id, ...addresses };
fs.writeFileSync(
  path.join(ROOT, "contracts", `addresses.${NETWORK_KEY}.json`),
  JSON.stringify(payload, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(ROOT, "contracts", "addresses.json"),
  JSON.stringify(payload, null, 2),
  "utf8",
);
console.log(`\nAddresses written to contracts/addresses.json and addresses.${NETWORK_KEY}.json`);

console.log("\nNext step: copy addresses into frontend/lib/contracts.ts");
