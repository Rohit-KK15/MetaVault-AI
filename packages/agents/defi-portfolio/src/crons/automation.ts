// src/services/monitoring-service.ts

import cron, { type ScheduledTask } from "node-cron";
import dedent from "dedent";
import { getRootAgent } from "../agents/agent";
import type { EnhancedRunner } from "@iqai/adk";
import { env } from "../env";

/**
 * Automated monitoring & management service for MetaVault.
 *
 * Uses node-cron (not setInterval).
 */
export class MonitoringService {
  private isRunning = false;
  private monitoringJob: ScheduledTask | null = null;
  private quickCheckJob: ScheduledTask | null = null;
  private yieldGenerateJob: ScheduledTask | null = null;

  constructor(
    private readonly monitoringCronExpr = "*/15 * * * *", // every 15 min
    private readonly quickCheckCronExpr = "*/5 * * * *", // every 5 min
    private readonly yieldGenerateCronExpr = "*/1 * * * *", // every 1 min
    private readonly telegramRunner: EnhancedRunner,
  ) { }

  /**
   * Start cron-based monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.log("⚠️ MonitoringService already running");
      return;
    }
    this.isRunning = true;

    console.log("🤖 Starting MonitoringService...");
    console.log(`📅 Comprehensive cycle: ${this.monitoringCronExpr}`);
    console.log(`⏱️ Quick price check: ${this.quickCheckCronExpr}`);
    console.log(`💹 Yield generation: ${this.yieldGenerateCronExpr}`);

    // Quick check every 5 minutes
    this.quickCheckJob = cron.schedule(this.quickCheckCronExpr, async () => {
      try {
        await this.quickPriceCheck();
      } catch (err) {
        console.error("❌ quickPriceCheck error:", (err as Error).message);
      }
    });

    // Full monitoring every 15 minutes
    this.monitoringJob = cron.schedule(this.monitoringCronExpr, async () => {
      try {
        await this.runMonitoringCycle();
      } catch (err) {
        console.error("❌ runMonitoringCycle error:", (err as Error).message);
      }
    });

    // Yield generation every 1 minute
    this.yieldGenerateJob = cron.schedule(this.yieldGenerateCronExpr, async () => {
      try {
        await this.yieldGeneration();
      } catch (err) {
        console.error("❌ yieldGeneration error:", (err as Error).message);
      }
    });

    // run one cycle immediately
    void this.runMonitoringCycle();

    console.log("✅ MonitoringService started");
  }

  /**
   * Stop cron jobs
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.quickCheckJob) this.quickCheckJob.stop();
    if (this.monitoringJob) this.monitoringJob.stop();

    console.log("🛑 MonitoringService stopped");
  }

  /**
   * Send report to Telegram via ADK runner
   */
  private async sendTelegramSummary(summary: string): Promise<void> {
    try {
      // const root = await getRootAgent();
      // const { runner } = root;

      await this.telegramRunner.ask(
        dedent`
        Send the following monitoring summary to Telegram channel ${env.TELEGRAM_CHANNEL_ID}:
        
        ${summary}
      `,
      );
      console.log("📨 Telegram summary sent");
    } catch (err: any) {
      console.error("❌ Error sending Telegram summary:", err.message);
    }
  }

  /**
   * Full monitoring cycle with 5 steps
   */
  public async runMonitoringCycle(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log("\n" + "=".repeat(80));
    console.log(`🔄 Running monitoring cycle @ ${timestamp}`);
    console.log("=".repeat(80));

    try {
      const root = await getRootAgent();
      const runner = root.runner as EnhancedRunner;

      // 1. Market prices
      console.log("📊 Step 1: Market prices...");
      const priceCheck = await runner.ask(
        "Check real LINK and WETH prices using get_token_prices and evaluate volatility (>10%).",
      );

      // 2. Leverage strategy
      console.log("⚖️ Step 2: Leverage strategy...");
      const leverageCheck = await runner.ask(
        "Use get_leverage_strategy_state to evaluate LTV, borrow amounts, and pause status.",
      );

      // 3. Risk assessment
      console.log("🚨 Step 3: Liquidation risk...");
      const riskCheck = await runner.ask(
        "Check liquidation risk using check_liquidation_risk and identify if deleveraging is required.",
      );

      // 4. Vault & strategies
      console.log("💼 Step 4: Vault state...");
      const vaultCheck = await runner.ask(
        "Fetch get_vault_state and get_strategy_states to determine if rebalancing is required.",
      );

      // 5. Actions to take
      console.log("🎯 Step 5: Decision making...");
      const actions = await runner.ask(
        dedent`
        Based on price, strategy, and risk:
        - Suggest pausing or resuming leverage
        - Suggest updating leverage parameters
        - Suggest rebalancing if allocations diverge
        - Suggest harvesting yields
        Provide reasoning and simulate transactions before recommending.
        `,
      );

      const summary = dedent`
        🤖 *MetaVault Monitoring Report*
        🕒 ${timestamp}

        📊 *Price Analysis:*  
        ${priceCheck}

        ⚖️ *Leverage State:*  
        ${leverageCheck}

        🚨 *Risk Assessment:*  
        ${riskCheck}

        💼 *Vault State:*  
        ${vaultCheck}

        🎯 *Actions:*  
        ${actions}
      `;

      await this.sendTelegramSummary(summary);

      console.log("✅ Monitoring cycle finished\n");
    } catch (err: any) {
      console.error("❌ Monitoring cycle error:", err.message);

      const errorReport = dedent`
        ❌ *Monitoring Error*
        🕒 ${new Date().toISOString()}
        Error: ${err.message}
      `;
      await this.sendTelegramSummary(errorReport);
    }
  }

  /**
   * Fast market check
   */
  public async quickPriceCheck(): Promise<void> {
    try {
      const root = await getRootAgent();
      const runner = root.runner as EnhancedRunner;

      const result = await runner.ask(
        "Quick check: Get LINK and WETH prices using get_token_prices tool and flag >15% movement.",
      );

      console.log(`[${new Date().toISOString()}] Quick Price Check →`, result);
    } catch (err: any) {
      console.error("quickPriceCheck error:", err.message);
      await this.sendTelegramSummary(
        `❌ Quick price check failed: ${err.message}`,
      );
    }
  }
  /**
   * Yield generation
   */
  public async yieldGeneration(): Promise<void> {
    try {
      const root = await getRootAgent();
      const runner = root.runner as EnhancedRunner;

      const result = await runner.ask(
        "accrue yield to the vault.",
      );

      console.log(`[${new Date().toISOString()}] Yield Generation →`, result);
    } catch (err: any) {
      console.error("yieldGeneration error:", err.message);
      await this.sendTelegramSummary(
        `❌ Yield generation failed: ${err.message}`,
      );
    }
  }
}



/**
 * Auto-start (matches your original script behavior).
 * Remove this if you want manual control.
 */
// const service = new MonitoringService();
// service.start();

// graceful shutdown
// process.on("SIGINT", () => {
//   console.log("👋 Stopping MonitoringService...");
//   service.stop();
//   process.exit(0);
// });
// process.on("SIGTERM", () => {
//   console.log("👋 Stopping MonitoringService...");
//   service.stop();
//   process.exit(0);
// });

export default MonitoringService;
