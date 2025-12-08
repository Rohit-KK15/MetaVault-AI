"use client";

import { VaultDashboard } from "@/components/VaultDashboard";
import { AgentChat } from "@/components/AgentChat";
import { WalletConnect } from "@/components/WalletConnect";
import { useState } from "react";
import { LayoutDashboard, Bot } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"vault" | "agent">("vault");

  return (
    <div className="flex min-h-screen bg-[#05050A]">
      {/* Sidebar */}
      <div className="w-64 glass-panel border-r border-white/5 p-6 flex flex-col relative overflow-hidden">
        {/* Decorative background glow for sidebar */}
        <div className="absolute top-0 left-0 w-full h-40 bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="mb-10 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Bot className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              MetaVault <span className="text-blue-400">AI</span>
            </h1>
          </div>
          <p className="text-xs text-gray-500 pl-11 font-medium tracking-wide uppercase opacity-70">
            Autonomous DeFi Vault
          </p>
        </div>

        <nav className="flex-1 space-y-2 relative z-10">
          <button
            onClick={() => setActiveTab("vault")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === "vault"
              ? "bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-white border border-blue-500/20"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            <LayoutDashboard size={18} className={activeTab === "vault" ? "text-blue-400" : "group-hover:text-gray-300"} />
            <span className="font-medium text-sm">Dashboard</span>
            {activeTab === "vault" && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("agent")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === "agent"
              ? "bg-gradient-to-r from-violet-600/20 to-violet-600/10 text-white border border-violet-500/20"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            <Bot size={18} className={activeTab === "agent" ? "text-violet-400" : "group-hover:text-gray-300"} />
            <span className="font-medium text-sm">AI Assistant</span>
            {activeTab === "agent" && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            )}
          </button>
        </nav>

        {/* User profile / status section could go here */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === "vault" ? "Dashboard" : "Agent Chat"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === "vault" ? "Real-time portfolio analytics & controls" : "Interact with your autonomous strategy agent"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-white/10 mx-2" />
            <WalletConnect />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto relative">
          <div className={activeTab === "vault" ? "block" : "hidden"}>
            <VaultDashboard />
          </div>
          <div className={`h-full ${activeTab === "agent" ? "block" : "hidden"}`}>
            <AgentChat />
          </div>
        </div>
      </div>
    </div>
  );
}
