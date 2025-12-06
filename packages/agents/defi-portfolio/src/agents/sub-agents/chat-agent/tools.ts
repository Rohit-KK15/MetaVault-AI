import { createTool, ToolContext } from "@iqai/adk";
import { z } from "zod";
import { VaultABI, MockERC20ABI } from "../../shared/abi";
import { chain_read, chain_write, toStringBN } from "../../shared/utils/chain";
import { format18, parseUnits } from "../../shared/utils/bigint";
import { env } from "../../../env";
import { ethers } from "ethers";

/* -----------------------------------------------------
   USER-FOCUSED TOOLS (No Admin Functions)
-----------------------------------------------------*/

/**
 * Get user's own balance and withdrawable amount
 * Only returns data for the requesting user
 */
export const get_user_vault_balance = createTool({
  name: "get_my_balance",
  description: "Gets the current user's vault share balance and withdrawable LINK amount. Only returns data for the requesting user.",
  schema: z.object({
    userAddress: z.string().describe("The user's wallet address")
  }),
  fn: async ({ userAddress }) => {
    const [
      balance,
      assets
    ] = await Promise.all([
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "balanceOf", [userAddress]),
      chain_read(env.VAULT_ADDRESS, VaultABI.abi, "convertToAssets", [
        await chain_read(env.VAULT_ADDRESS, VaultABI.abi, "balanceOf", [userAddress])
      ])
    ]);

    const raw = {
      shares: balance.toString(),
      withdrawable: assets.toString(),
    };

    const human = {
      shares: format18(raw.shares),
      withdrawable: format18(raw.withdrawable),
    };

    return toStringBN({ raw, human });
  }
});

export const get_wallet_link_balance = createTool({
  name: "get_link_balance",
  description: "Returns the user's LINK balance in their wallet.",
  schema: z.object({
    wallet: z.string().describe("The user's wallet address"),
  }),

  fn: async ({ wallet }) => {
    if (!wallet) {
      throw new Error("Wallet address is required to check LINK balance");
    }

    // Read ERC20 balanceOf(wallet)
    const rawBalance = await chain_read(
      env.LINK_ADDRESS,
      MockERC20ABI.abi,
      "balanceOf",
      [wallet]
    );

    const human = format18(rawBalance);

    return {
      wallet,
      rawBalance: rawBalance.toString(),
      balance: human,
      symbol: "LINK",
      message: `The wallet ${wallet} has ${human} LINK.`,
    };
  },
});

/**
 * Get public vault information (no confidential data)
 */
export const get_public_vault_info = createTool({
  name: "get_public_vault_info",
  description: "Gets public vault information including total assets, total supply, and total managed assets. This is public information available to all users.",
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
      totalSupply: format18(totalSupply),
      totalManaged: format18(raw.totalManaged),
    };

    return toStringBN({ raw, human });
  }
});

export const check_allowance = createTool({
  name: "check_allowance",
  description: "Checks if user's LINK token allowance is enough for a deposit.",
  schema: z.object({
    wallet: z.string(),
    amount: z.string(),
  }),
  fn: async ({ wallet, amount }) => {
    const LINK = process.env.LINK_TOKEN_ADDRESS!;
    const VAULT = process.env.VAULT_ADDRESS!;
    const needed = parseUnits(amount);

    const allowance = await chain_read(
      LINK,
      MockERC20ABI.abi,
      "allowance",
      [wallet, VAULT]
    );

    return {
      allowance: allowance.toString(),
      enough: allowance >= needed,
      needed: needed.toString(),
      wallet,
    };
  },
});

export const approve_link = createTool({
  name: "approve_link",
  description: "Prepares an unsigned approval transaction so the vault can spend LINK.",
  schema: z.object({
    amount: z.string(),
  }),
  fn: async ({ amount }) => {
    const LINK = process.env.LINK_TOKEN_ADDRESS!;
    const VAULT = process.env.VAULT_ADDRESS!;

    const iface = new ethers.Interface(MockERC20ABI.abi);
    const data = iface.encodeFunctionData("approve", [
      VAULT,
      parseUnits(amount),
    ]);

    return {
      unsignedTx: {
        to: LINK,
        data,
        value: "0"
      },
      message: `Please sign this transaction to approve ${amount} LINK for spending.`,
    };
  },
});



/**
 * User deposit function
 */
export const user_deposit = createTool({
  name: "user_deposit",
  description: "Prepares an unsigned LINK deposit transaction for the user to sign in their wallet.",
  schema: z.object({
    amount: z.string().describe("Amount of LINK to deposit")
  }),
  fn: async ({ amount }) => {
    const parsedAmount = parseUnits(amount);

    // Prepare call data
    const iface = new ethers.Interface(VaultABI.abi);
    const data = iface.encodeFunctionData("deposit", [parsedAmount]);

    return {
      success: true,
      unsignedTx: {
        to: env.VAULT_ADDRESS,
        data,
        value: "0"
      },
      message: `Please sign this deposit transaction for ${amount} LINK.`
    };

  }
});


/**
 * User withdraw function
 */
export const user_withdraw = createTool({
  name: "user_withdraw",
  description: "Withdraws shares from the vault for the user. Returns transaction hash.",
  schema: z.object({
    shares: z.string().describe("Number of shares to withdraw (in human-readable format)")
  }),
  fn: async ({ shares }) => {
    const parsedAmount = parseUnits(shares);
    // Prepare call data
    const iface = new ethers.Interface(VaultABI.abi);
    const data = iface.encodeFunctionData("withdraw", [parsedAmount]);

    return {
      success: true,
      unsignedTx: {
        to: env.VAULT_ADDRESS,
        data,
        value: "0"
      },
      message: `Please sign this withdraw transaction for ${shares} LINK.`
    };
  }
});

/**
 * Get token prices (public information)
 */
export const get_token_prices = createTool({
  name: "get_token_prices",
  description: "Fetches real-time LINK price from CoinGecko API. Returns public market prices.",
  fn: async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=chainlink,weth&vs_currencies=usd&include_24hr_change=true"
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        chainlink?: { usd: number; usd_24h_change?: number };
        weth?: { usd: number; usd_24h_change?: number };
      };

      const linkPriceUSD = data.chainlink?.usd || 0;
      const link24hChange = data.chainlink?.usd_24h_change || 0;

      if (linkPriceUSD === 0) {
        throw new Error("Failed to fetch valid prices from CoinGecko");
      }

      const raw = {
        linkPriceUSD: BigInt(Math.floor(linkPriceUSD * 1e18)).toString(),
      };

      const human = {
        linkPriceUSD: linkPriceUSD.toFixed(2),
        link24hChange: link24hChange.toFixed(2) + "%",
      };

      return { raw, human, source: "CoinGecko API" };
    } catch (error: any) {
      throw new Error(`Failed to fetch prices: ${error.message}`);
    }
  }
});

export const convert_to_shares = createTool({
  name: "convert_to_shares",
  description: "To convert LINK amount to Vault Share Tokens(VST).",
  schema: z.object({
    amount: z.string().describe("The amount of LINK (in Human Readable Format)")
  }),
  fn: async ({ amount }) => {
    const shares = await chain_read(
      env.VAULT_ADDRESS,
      VaultABI.abi,
      "convertToShares",
      [parseUnits(amount)]
    );

    return format18(shares);
  }
});

export const convert_to_assets = createTool({
  name: "convert_to_assets",
  description: "To convert Vault Share Tokens(VST) to LINK.",
  schema: z.object({
    shares: z.string().describe("The amount of shares or VST (in Human Readable Format)")
  }),
  fn: async ({ shares }) => {
    const linkAmount = await chain_read(
      env.VAULT_ADDRESS,
      VaultABI.abi,
      "convertToAssets",
      [parseUnits(shares)]
    );

    return format18(linkAmount);
  }
});

/**
 * Get vault APY (public information)
 */
import { calculateVaultAPY } from "../strategy-sentinel-agent/tools";

export const get_vault_apy = createTool({
  name: "get_vault_apy",
  description: "Gets the current vault APY based on TVL growth. This is public information.",
  fn: async (_params: {}, toolContext: ToolContext) => {
    return calculateVaultAPY(toolContext);
  }
});

/* -----------------------------------------------------
   EXPORT ALL USER TOOLS
-----------------------------------------------------*/
export default {
  get_user_vault_balance,
  get_wallet_link_balance,
  get_public_vault_info,
  user_deposit,
  user_withdraw,
  get_token_prices,
  get_vault_apy,
};

