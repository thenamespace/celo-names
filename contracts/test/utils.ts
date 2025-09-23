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

/**
 * DNS encode a domain name for ENS resolution
 * @param name - Domain name to encode (e.g., "celo.eth")
 * @returns DNS-encoded hex string (e.g., "0x0463656c6f0365746800")
 */
export function dnsEncode(name: string): `0x${string}` {
  if (name === '') return '0x00'; // Root domain
  
  const labels = name.split('.');
  let encoded = '0x';
  
  for (const label of labels) {
    const labelBytes = Buffer.from(label, 'utf8').toString('hex');
    const length = label.length.toString(16).padStart(2, '0');
    encoded += length + labelBytes;
  }
  
  encoded += '00'; // Null terminator
  
  return encoded as `0x${string}`;
}
