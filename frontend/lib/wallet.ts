// Minimal EIP-1193 wallet-connect layer — no SDK dependency. GenLayer's
// Bradbury testnet is EVM-compatible, so a standard injected provider
// (MetaMask etc.) can add/switch to it and sign transactions directly;
// no GenLayer-specific SDK is needed for basic connect + sign.

export const BRADBURY_CHAIN = {
  chainIdHex: "0x107D", // 4221
  chainIdDecimal: 4221,
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"],
};

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
}

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

export async function requestAccounts(provider: Eip1193Provider): Promise<string[]> {
  return (await provider.request({ method: "eth_requestAccounts" })) as string[];
}

export async function getChainId(provider: Eip1193Provider): Promise<string> {
  return (await provider.request({ method: "eth_chainId" })) as string;
}

// Attempts to switch to Bradbury; if the wallet doesn't know the chain yet, adds it first.
export async function ensureBradburyChain(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRADBURY_CHAIN.chainIdHex }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BRADBURY_CHAIN.chainIdHex,
            chainName: BRADBURY_CHAIN.chainName,
            nativeCurrency: BRADBURY_CHAIN.nativeCurrency,
            rpcUrls: BRADBURY_CHAIN.rpcUrls,
            blockExplorerUrls: BRADBURY_CHAIN.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

// Sends a native GEN transfer. valueGen is a decimal string, e.g. "25000" or "25000.5".
export async function sendNativeTransfer(
  provider: Eip1193Provider,
  from: string,
  to: string,
  valueGen: string
): Promise<string> {
  const valueWei = parseDecimalToWeiHex(valueGen);
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to, value: valueWei }],
  });
  return txHash as string;
}

function parseDecimalToWeiHex(valueGen: string): string {
  const [whole, frac = ""] = valueGen.replace(/,/g, "").split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  const wei = BigInt(whole || "0") * BigInt(10) ** BigInt(18) + BigInt(fracPadded || "0");
  return "0x" + wei.toString(16);
}

export function shortenAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
