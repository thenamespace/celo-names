import { Hash } from 'viem';
import { IPermit } from './vars';

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

/**
 * Generate EIP-712 permit signature for ERC20 tokens
 * @param wallet - Wallet client for signing
 * @param tokenContract - Token contract to get name and nonce
 * @param spender - Address to approve (registrar)
 * @param value - Amount to approve
 * @param deadline - Permit expiration time
 * @returns Permit signature object with v, r, s components
 */
export async function generatePermitSignature(
  wallet: any,
  tokenContract: any,
  spender: string,
  value: bigint,
  deadline: bigint
): Promise<IPermit> {
  const { viem } = await import('hardhat');
  
  const nonce = await tokenContract.read.nonces([wallet.account.address]);
  
  // Get the actual chain ID
  const client = await viem.getPublicClient();
  const chainId = await client.getChainId();
  
  // Get token name for domain
  const tokenName = await tokenContract.read.name();
  
  // EIP-712 signature data
  const domain = {
    name: tokenName,
    version: '1',
    chainId: chainId,
    verifyingContract: tokenContract.address,
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const message = {
    owner: wallet.account.address,
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };

  // Sign the permit
  const signature = await wallet.signTypedData({
    domain,
    types,
    primaryType: 'Permit',
    message,
  });

  // Split signature
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as Hash;
  const s = `0x${sig.slice(64, 128)}` as Hash;
  const v = parseInt(sig.slice(128, 130), 16);

  return {
    value,
    deadline,
    v,
    r,
    s,
  };
}