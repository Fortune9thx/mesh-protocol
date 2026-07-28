"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const bradbury = defineChain({
  id: 4221,
  name: "GenLayer Bradbury",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-bradbury.genlayer.com"] },
  },
  blockExplorers: {
    default: { name: "GenLayer Explorer", url: "https://explorer-bradbury.genlayer.com" },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "Mesh Protocol",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "mesh-protocol-demo",
  chains: [bradbury],
  ssr: true,
});
