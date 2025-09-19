export function equalsIgnoreCase(str1: string, str2: string): boolean {
  return str1.toLowerCase() === str2.toLowerCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert USD price to ETH wei
 * @param usdPrice - Price in USD (as bigint)
 * @param ethPriceUsd - ETH price in USD (as bigint with 8 decimals)
 * @returns Price in wei
 */
export function dollarsToEth(usdPrice: bigint, ethPriceUsd: bigint): bigint {
  // Formula: (usdPrice * 1e8 * 1e18) / ethPriceUsd
  // usdPrice is in dollars, ethPriceUsd has 8 decimals
  return (usdPrice * 10n ** 8n * 10n ** 18n) / ethPriceUsd;
}
