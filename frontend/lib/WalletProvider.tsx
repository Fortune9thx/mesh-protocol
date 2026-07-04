"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  BRADBURY_CHAIN,
  ensureBradburyChain,
  getChainId,
  getInjectedProvider,
  requestAccounts,
  sendNativeTransfer,
  signMessage,
  type Eip1193Provider,
} from "./wallet";
import { setAuthCredentials } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3100";

interface WalletState {
  address: string | null;
  chainId: string | null;
  jwt: string | null;
  connecting: boolean;
  signingIn: boolean;
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
  const [jwt, setJwt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProvider(getInjectedProvider());
  }, []);

  useEffect(() => {
    if (!provider) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts[0] ?? null);
      setJwt(null); // clear JWT when account changes — must re-authenticate
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
   * Full sign-in flow:
   *   1. eth_requestAccounts — MetaMask popup
   *   2. wallet_switchEthereumChain — ensure Bradbury
   *   3. GET /auth/challenge — fetch nonce
   *   4. personal_sign — MetaMask signature prompt
   *   5. POST /auth/verify — exchange sig for JWT
   */
  const connect = useCallback(async () => {
    if (!provider) {
      setError("No wallet extension detected (e.g. MetaMask)");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await requestAccounts(provider);
      const wallet = accounts[0];
      if (!wallet) throw new Error("No account returned");

      await ensureBradburyChain(provider);
      setChainId(await getChainId(provider));
      setAddress(wallet);

      // EIP-191 challenge–response to get a JWT
      setSigningIn(true);
      const challengeRes = await fetch(`${API_URL}/auth/challenge?wallet=${wallet.toLowerCase()}`);
      if (!challengeRes.ok) throw new Error("Failed to fetch auth challenge");
      const { message } = (await challengeRes.json()) as { message: string };

      const signature = await signMessage(provider, wallet, message);

      const verifyRes = await fetch(`${API_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: wallet.toLowerCase(), signature }),
      });
      if (!verifyRes.ok) {
        const body = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Authentication failed");
      }
      const { token } = (await verifyRes.json()) as { token: string };
      setJwt(token);
      setAuthCredentials(token, wallet.toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setJwt(null);
      setAuthCredentials(null, null);
    } finally {
      setConnecting(false);
      setSigningIn(false);
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setJwt(null);
    setAuthCredentials(null, null);
  }, []);

  const sendGen = useCallback(
    async (to: string, amountGen: string) => {
      if (!provider || !address) throw new Error("Wallet not connected");
      return sendNativeTransfer(provider, address, to, amountGen);
    },
    [provider, address]
  );

  const onCorrectChain = chainId === BRADBURY_CHAIN.chainIdHex;

  return (
    <WalletContext.Provider
      value={{ address, chainId, jwt, connecting, signingIn, error, onCorrectChain, connect, disconnect, sendGen }}
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
