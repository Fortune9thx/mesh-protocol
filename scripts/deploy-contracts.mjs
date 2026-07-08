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
 *   4. EscrowVault        (needs NegotiationEngine address -> patched before deploy)
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
const { testnetBradbury } = await import("genlayer-js/chains");

const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

async function deployContract(name, codePath) {
  console.log(`\nDeploying ${name}...`);
  const code = fs.readFileSync(codePath, "utf8");
  try {
    const tx = await client.deployContract({ code, args: [], leaderOnly: false });
    console.log(`  tx: ${tx}`);
    const receipt = await client.waitForTransactionReceipt({ hash: tx, status: "FINALIZED" });
    const address = receipt?.data?.contract_address ?? receipt?.contractAddress ?? "UNKNOWN";
    console.log(`  ${name}: ${address}`);
    return address;
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    throw err;
  }
}

console.log("=== Mesh Protocol Contract Deployment ===");
console.log(`Chain: GenLayer Bradbury Testnet`);
console.log(`Account: ${account.address ?? "(derived from key)"}`);

const addresses = {};

// 1. AgentRegistry
addresses.AgentRegistry = await deployContract(
  "AgentRegistry",
  path.join(ROOT, "contracts", "AgentRegistry.py"),
);

// 2. IntentRegistry
addresses.IntentRegistry = await deployContract(
  "IntentRegistry",
  path.join(ROOT, "contracts", "IntentRegistry.py"),
);

// 3. NegotiationEngine
addresses.NegotiationEngine = await deployContract(
  "NegotiationEngine",
  path.join(ROOT, "contracts", "NegotiationEngine.py"),
);

// 4. EscrowVault -- patch NegotiationEngine address into source before deploying
const escrowSrc = fs.readFileSync(
  path.join(ROOT, "contracts", "EscrowVault.py"),
  "utf8",
);
const patchedEscrow = escrowSrc.replace(
  /NEGOTIATION_ENGINE_ADDRESS = Address\("0x[0-9a-fA-F]+"\)/,
  `NEGOTIATION_ENGINE_ADDRESS = Address("${addresses.NegotiationEngine}")`,
);
const tmpEscrow = path.join(ROOT, "contracts", "_EscrowVault_patched.py");
fs.writeFileSync(tmpEscrow, patchedEscrow, "utf8");

addresses.EscrowVault = await deployContract("EscrowVault", tmpEscrow);
fs.unlinkSync(tmpEscrow);

// 5. ReputationLedger
addresses.ReputationLedger = await deployContract(
  "ReputationLedger",
  path.join(ROOT, "contracts", "ReputationLedger.py"),
);

// Output results
console.log("\n\n=== DEPLOYED ADDRESSES ===");
for (const [name, addr] of Object.entries(addresses)) {
  console.log(`${name.padEnd(20)}: ${addr}`);
}

// Write addresses.json for frontend to pick up
const outPath = path.join(ROOT, "contracts", "addresses.json");
fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2), "utf8");
console.log(`\nAddresses written to contracts/addresses.json`);

// Patch EscrowVault.py permanently with the real NegotiationEngine address
const finalEscrow = escrowSrc.replace(
  /NEGOTIATION_ENGINE_ADDRESS = Address\("0x[0-9a-fA-F]+"\)/,
  `NEGOTIATION_ENGINE_ADDRESS = Address("${addresses.NegotiationEngine}")`,
);
fs.writeFileSync(path.join(ROOT, "contracts", "EscrowVault.py"), finalEscrow, "utf8");
console.log("EscrowVault.py patched with live NegotiationEngine address.");

console.log("\nNext step: copy addresses into frontend/lib/contracts.ts");
