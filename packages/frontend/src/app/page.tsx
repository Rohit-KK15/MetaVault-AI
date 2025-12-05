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
      <div className="w-64 glass-panel border-r border-white/5 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gradient">DeFi Vault</h1>
          <p className="text-xs text-gray-500 mt-1">AI-Powered Strategy</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab("vault")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "vault"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("agent")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "agent"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            <Bot size={20} />
            <span className="font-medium">AI Agent</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="glass-panel border-b border-white/5 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {activeTab === "vault" ? "Vault Dashboard" : "AI Assistant"}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === "vault" ? "Manage your DeFi portfolio" : "Chat with your strategy agent"}
            </p>
          </div>
          <WalletConnect />
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
