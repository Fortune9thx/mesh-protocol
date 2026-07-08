"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  BRADBURY_CHAIN,
  ensureBradburyChain,
  getChainId,
  getInjectedProvider,
  sendNativeTransfer,
  requestAccounts,
  type Eip1193Provider,
} from "./wallet";
import { setWalletProvider } from "./api";

interface WalletState {
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
  onCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendGen: (to: string, amountGen: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProvider(getInjectedProvider());
  }, []);

  useEffect(() => {
    if (!provider) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      const wallet = accounts[0] ?? null;
      setAddress(wallet);
      if (wallet) setWalletProvider(provider, wallet);
      else setWalletProvider(null, "");
    };
    const onChainChanged = (...args: unknown[]) => setChainId(args[0] as string);
    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    return () => {
      provider.removeListener("accountsChanged", onAccountsChanged);
      provider.removeListener("chainChanged", onChainChanged);
    };
  }, [provider]);

  /**
   * Connect flow (no backend JWT required -- pure on-chain):
   *   1. eth_requestAccounts -- MetaMask popup
   *   2. wallet_switchEthereumChain -- ensure Bradbury
   *   3. Wire provider + address into api.ts for write calls
   */
  const connect = useCallback(async () => {
    if (!provider) {
      setError("No wallet extension detected. Install MetaMask to continue.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await requestAccounts(provider);
      const wallet = accounts[0];
      if (!wallet) throw new Error("No account returned from wallet");

      await ensureBradburyChain(provider);
      setChainId(await getChainId(provider));
      setAddress(wallet);
      setWalletProvider(provider, wallet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletProvider(null, "");
  }, []);

  const sendGen = useCallback(
    async (to: string, amountGen: string) => {
      if (!provider || !address) throw new Error("Wallet not connected");
      return sendNativeTransfer(provider, address, to, amountGen);
    },
    [provider, address],
  );

  const onCorrectChain = chainId === BRADBURY_CHAIN.chainIdHex;

  return (
    <WalletContext.Provider
      value={{ address, chainId, connecting, error, onCorrectChain, connect, disconnect, sendGen }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
