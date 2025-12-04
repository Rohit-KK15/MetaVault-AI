/**
 * Automated Monitoring and Management System
 * 
 * This cron job runs the Strategy Sentinel Agent periodically to:
 * - Monitor real LINK and WETH prices
 * - Check leverage strategy state and risk metrics
 * - Adjust leverage parameters based on market conditions
 * - Update target weights between strategies
 * - Rebalance vault when needed
 * - Harvest yields
 * - Pause/unpause strategies based on risk
 */

import cron from "node-cron";
import { getRootAgent } from "../agents/agent";

// Track last known prices for volatility detection
let lastLinkPrice = 0;
let lastWethPrice = 0;
let lastCheckTime = Date.now();

/**
 * Main monitoring function - runs comprehensive checks
 */
async function runMonitoringCycle() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log("\n" + "=".repeat(80));
  console.log(`🔄 Starting monitoring cycle at ${timestamp}`);
  console.log("=".repeat(80));

  try {
    const agent = await getRootAgent();
    const { runner } = agent;

    // 1. Price and Market Analysis
    console.log("\n📊 Step 1: Checking real market prices...");
    const priceCheck = await runner.ask(
      "Check real LINK and WETH prices using get_token_prices. Analyze price movements and volatility. " +
      "If prices have changed significantly (>10%) or are volatile, note this for leverage strategy decisions."
    );
    console.log("Price Analysis:", priceCheck);

    // 2. Leverage Strategy State Check
    console.log("\n⚖️ Step 2: Checking leverage strategy state...");
    const leverageCheck = await runner.ask(
      "Check the leverage strategy state using get_leverage_strategy_state. " +
      "Review LTV, borrowed amounts, pause status, and leverage parameters. " +
      "Assess if the strategy is at risk or needs adjustment."
    );
    console.log("Leverage State:", leverageCheck);

    // 3. Risk Assessment
    console.log("\n🚨 Step 3: Assessing liquidation risk...");
    const riskCheck = await runner.ask(
      "Check liquidation risk using check_liquidation_risk. " +
      "If LTV is above 70% or critical, recommend deleveraging or pausing the strategy."
    );
    console.log("Risk Assessment:", riskCheck);

    // 4. Vault and Strategy States
    console.log("\n💼 Step 4: Checking vault and strategy states...");
    const vaultCheck = await runner.ask(
      "Check vault state using get_vault_state and strategy states using get_strategy_states. " +
      "Compare current allocations vs target weights. Determine if rebalancing is needed."
    );
    console.log("Vault State:", vaultCheck);

    // 5. Decision Making and Actions
    console.log("\n🎯 Step 5: Making decisions and taking actions...");
    const decisionPrompt = `
      Based on all the data you've gathered:
      1. If LINK/WETH prices are volatile (>10% change) or dropping rapidly:
         - Consider pausing leverage strategy (toggle_leverage_strategy_pause)
         - Or reduce leverage parameters (update_leverage_params: lower maxDepth and borrowFactor)
      
      2. If LTV is high (>70%) or liquidation risk is critical:
         - Execute auto_deleverage to reduce risk
         - Or pause the leverage strategy
      
      3. If current allocations diverge from target weights:
         - Update target weights (update_strategy_target_weights) based on market conditions
         - Then call rebalance_vault to execute the reallocation
      
      4. If prices are stable and conditions are favorable:
         - Maintain or slightly increase leverage if safe
         - Ensure target weights are optimal
      
      5. Check if harvest is needed (harvest_strategy)
      
      Take appropriate actions based on the current market conditions and risk levels.
      Explain your reasoning for each action.
    `;
    
    const actions = await runner.ask(decisionPrompt);
    console.log("Actions Taken:", actions);

    const duration = Date.now() - startTime;
    console.log("\n" + "=".repeat(80));
    console.log(`✅ Monitoring cycle completed in ${duration}ms`);
    console.log("=".repeat(80) + "\n");

  } catch (error: any) {
    console.error("\n❌ Error in monitoring cycle:", error.message);
    console.error("Stack:", error.stack);
    console.log("=".repeat(80) + "\n");
  }
}

/**
 * Quick price check - runs more frequently
 */
async function quickPriceCheck() {
  try {
    const agent = await getRootAgent();
    const { runner } = agent;
    
    const result = await runner.ask(
      "Quick check: Get current LINK and WETH prices. " +
      "If prices changed >15% since last check, flag for immediate review."
    );
    
    console.log(`[${new Date().toISOString()}] Quick price check:`, result);
  } catch (error: any) {
    console.error("Quick price check error:", error.message);
  }
}

// Schedule comprehensive monitoring every 15 minutes
// Cron format: minute hour day month day-of-week
// "*/15 * * * *" = every 15 minutes
cron.schedule("*/15 * * * *", () => {
  runMonitoringCycle();
});

// Schedule quick price checks every 5 minutes for rapid response
cron.schedule("*/5 * * * *", () => {
  quickPriceCheck();
});

// Run comprehensive check on startup
console.log("🤖 Automated monitoring system starting...");
console.log("📅 Schedule: Comprehensive checks every 15 minutes, quick price checks every 5 minutes");
runMonitoringCycle();

// Keep the process alive
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down monitoring system...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down monitoring system...");
  process.exit(0);
});