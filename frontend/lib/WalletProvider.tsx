"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { setWalletProvider } from "./api";
import { sendNativeTransfer } from "./wallet";

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
  const { address, chainId, isConnecting, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Wire the raw EIP-1193 provider into genlayer-js api.ts whenever the
  // account connects or changes (wagmi connector exposes getProvider()).
  useEffect(() => {
    if (address && connector) {
      connector.getProvider().then((provider) => {
        setWalletProvider(provider, address);
      }).catch(console.error);
    } else {
      setWalletProvider(null, "");
    }
  }, [address, connector]);

  const sendGen = useCallback(
    async (to: string, amountGen: string) => {
      if (!address || !connector) throw new Error("Wallet not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = await connector.getProvider() as any;
      return sendNativeTransfer(provider, address, to, amountGen);
    },
    [address, connector],
  );

  // connect/disconnect are handled by the RainbowKit ConnectButton modal.
  // These stubs keep the WalletContext interface stable for components that
  // still reference them (e.g. FundWalletModal).
  const connect = useCallback(async () => {}, []);
  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setWalletProvider(null, "");
  }, [wagmiDisconnect]);

  const onCorrectChain = chainId === 4221;

  return (
    <WalletContext.Provider
      value={{
        address: address ?? null,
        chainId: chainId ? `0x${chainId.toString(16)}` : null,
        connecting: isConnecting,
        error: null,
        onCorrectChain,
        connect,
        disconnect,
        sendGen,
      }}
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
