import { type ClassValue, clsx } from "clsx";
import { formatUnits, parseUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}

export function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

