import { createTool } from "@iqai/adk";
import { z } from "zod";
import { 
  StrategyLeverageABI, 
  StrategyAaveV3ABI, 
  VaultABI, 
  StrategyRouterABI
} from "../../shared/abi";
import { chain_read, chain_write, toStringBN } from "../../shared/utils/chain";
import { format18 } from "../../shared/utils/bigint";
import { env } from "../../../env";

/* -----------------------------------------------------
   1️⃣ READ TOOLS
-----------------------------------------------------*/

export const get_vault_state = createTool({
  name: "get_vault_state",
  description: "Reads the vault's global state.",
  fn: async () => {
    const [
      totalAssets,
      totalSupply,
      totalManaged,
    ] = await Promise.all([
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "totalAssets", []),
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "totalSupply", []),
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "totalManagedAssets", []),
    ]);

    const raw = {
      totalAssets: totalAssets.toString(),
      totalSupply: totalSupply.toString(),
      totalManaged: totalManaged.toString(),
    };

    const human = {
      totalAssets: format18(raw.totalAssets),
      totalSupply: raw.totalSupply,
      totalManaged: format18(raw.totalManaged),
    };

    return toStringBN({ raw, human });
  }
});


export const get_strategy_states = createTool({
  name: "get_strategy_states",
  description: "Fetches detailed state for all strategies.",
  fn: async () => {
    const [
      poolBal,
      leverageDeposited,
      leverageBorrowed
    ] = await Promise.all([
      chain_read(env.STRATEGY_AAVE_ADDRESS, StrategyAaveV3ABI.abi, "strategyBalance", []),
      chain_read(env.STRATEGY_LEVERAGE_ADDRESS, StrategyLeverageABI.abi, "deposited", []),
      chain_read(env.STRATEGY_LEVERAGE_ADDRESS, StrategyLeverageABI.abi, "borrowedWETH", []),
    ]);

    const raw = {
      aaveBal: poolBal.toString(),
      levDeposited: leverageDeposited.toString(),
      levBorrowed: leverageBorrowed.toString()
    };

    const human = {
      aaveBal: format18(raw.aaveBal),
      levDeposited: format18(raw.levDeposited),
      levBorrowed: format18(raw.levBorrowed),
    };

    return toStringBN({ raw, human });
  }
});


export const get_user_balances = createTool({
  name: "get_user_balances",
  description: "Fetches vault share balance and withdrawable amount for a user.",
  schema: z.object({
    user: z.string()
  }),
  fn: async ({ user }) => {
    const [
      balance,
      assets
    ] = await Promise.all([
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "balanceOf", [user]),
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "convertToAssets", [
        await chain_read(env.VAULT_ADDRESS, VaultABI.abi, "balanceOf", [user])
      ])
    ]);

    const raw = {
      shares: balance.toString(),
      withdrawable: assets.toString(),
    };

    const human = {
      shares: raw.shares,
      withdrawable: format18(raw.withdrawable),
    };

    return toStringBN({ raw, human });
  }
});


/* -----------------------------------------------------
   2️⃣ WRITE TOOLS (TX SENDING)
-----------------------------------------------------*/

export const vault_deposit = createTool({
  name: "vault_deposit",
  description: "Deposit LINK into vault.",
  schema: z.object({
    amount: z.string()
  }),
  fn: async ({ amount }) => {
    const tx = await chain_write(
      env.VAULT_ADDRESS,
      VaultABI.abi,
      "deposit",
      [amount] // value: LINK
    );
    return tx.toString();
  }
});


export const vault_withdraw = createTool({
  name: "vault_withdraw",
  description: "Withdraw shares from vault.",
  schema: z.object({
    shares: z.string()
  }),
  fn: async ({ shares }) => {
    const tx = await chain_write(env.VAULT_ADDRESS, VaultABI.abi, "withdraw", [shares]);
    return tx.toString();
  }
});


export const rebalance_vault = createTool({
  name: "rebalance_vault",
  description: "Triggers vault rebalance().",
  fn: async () => {
    const tx = await chain_write(env.ROUTER_ADDRESS, StrategyRouterABI.abi, "rebalance", []);
    return tx.toString();
  }
});


export const harvest_strategy = createTool({
  name: "harvest_strategy",
  description: "Calls harvest() on a given strategy.",
  schema: z.object({
    strategy: z.string()
  }),
  fn: async ({ strategy }) => {
    const tx = await chain_write(strategy, StrategyAaveV3ABI.abi, "harvest", []);
    return tx.toString();
  }
});


/* -----------------------------------------------------
   3️⃣ RISK MANAGEMENT TOOLS
-----------------------------------------------------*/

export const check_liquidation_risk = createTool({
  name: "check_liquidation_risk",
  description: "Checks leverage strategy liquidation risk.",
  fn: async () => {
    const [
      deposited,
      borrowed
    ] = await Promise.all([
      chain_read(env.STRATEGY_LEVERAGE_ADDRESS, StrategyLeverageABI.abi, "deposited", []),
      chain_read(env.STRATEGY_LEVERAGE_ADDRESS, StrategyLeverageABI.abi, "borrowedWETH", []),
    ]);

    const dep = Number(format18(deposited.toString()));
    const bor = Number(format18(borrowed.toString()));

    const ltv = bor / dep;

    return {
      ltv,
      safe: ltv < 0.70,
      warning: ltv >= 0.70 && ltv < 0.80,
      critical: ltv >= 0.80,
    };
  }
});


export const auto_deleverage = createTool({
  name: "auto_deleverage",
  description: "Repay debt to reduce liquidation risk.",
  fn: async () => {
    const tx = await chain_write(
      env.ROUTER_ADDRESS,
      StrategyRouterABI.abi,
      "triggerDeleverage",
      [env.STRATEGY_LEVERAGE_ADDRESS, 10]
    );
    return tx.toString();
  }
});


/* -----------------------------------------------------
   4️⃣ SIMULATION TOOLS
-----------------------------------------------------*/

// export const simulate_yield = createTool({
//   name: "simulate_yield",
//   description: "Simulates yield for n days using compound interest.",
//   schema: z.object({
//     principal: z.string(),
//     apr: z.number(),
//     days: z.number()
//   }),
//   fn: async ({ principal, apr, days }) => {
//     const p = Number(format18(principal));
//     const daily = apr / 365;
//     const amount = p * Math.pow(1 + daily, days);

//     return {
//       initial: p,
//       final: amount,
//       profit: amount - p
//     };
//   }
// });



/* -----------------------------------------------------
   EXPORT ALL
-----------------------------------------------------*/
export default {
  get_vault_state,
  get_strategy_states,
  get_user_balances,
  vault_deposit,
  vault_withdraw,
  rebalance_vault,
  harvest_strategy,
  check_liquidation_risk,
  auto_deleverage,
  // simulate_yield
};
