"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { formatAddress } from "@/lib/utils";
import { Wallet, LogOut, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleConnect = () => {
    const rabbyConnector = connectors.find((c) => c.id === "rabby");
    const metamaskConnector = connectors.find((c) => c.id === "metaMask");
    const injectedConnector = connectors.find((c) => c.id === "injected");

    if (rabbyConnector) return connect({ connector: rabbyConnector });
    if (metamaskConnector) return connect({ connector: metamaskConnector });

    // Fallback: Use injected ONLY IF it's NOT Brave
    if (injectedConnector && !window.ethereum?.isBraveWallet) {
      return connect({ connector: injectedConnector });
    }

    alert("No compatible wallet found. Install MetaMask or Rabby.");
  };


  if (!isMounted) return null;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1 pr-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-mono text-sm text-blue-100 font-medium">
            {formatAddress(address)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          title="Disconnect"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isPending}
      className="group flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Wallet size={18} className="group-hover:-rotate-12 transition-transform" />
      )}
      <span>{isPending ? "Connecting..." : "Connect Wallet"}</span>
    </button>
  );
}
