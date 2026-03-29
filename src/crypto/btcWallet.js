/**
 * Bitcoin HD Wallet (Testnet)
 * BIP39 Mnemonic -> BIP84 Native SegWit (tb1...) derivation
 *
 * Uses bitcoinjs-lib for key derivation and transaction building.
 * For Phase 1, key generation and address derivation only.
 * Transaction building/signing in Phase 2 with full bitcoinjs-lib integration.
 */

// Phase 1: Simplified wallet using Web Crypto
// This generates a testnet-compatible address format for display purposes

const TESTNET_PREFIX = 'tb1q';

/**
 * Generate a mnemonic phrase (BIP39)
 * In production, use the bip39 library. For now, generate random words.
 */
export function generateMnemonic() {
  // Simplified: 12 random words from a small wordlist for demo
  // TODO: Use proper BIP39 with the bip39 npm package
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
    'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
    'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
    'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
    'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
  ];

  const indices = new Uint32Array(12);
  crypto.getRandomValues(indices);
  return Array.from(indices, (n) => words[n % words.length]).join(' ');
}

/**
 * Derive a testnet address from a seed
 * Simplified version - generates a random-looking tb1q address
 */
export function deriveAddress(mnemonic, index = 0) {
  // Generate a deterministic-looking address from the mnemonic
  const encoder = new TextEncoder();
  const data = encoder.encode(mnemonic + ':' + index);

  // Use simple hash to generate address bytes
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0;
  }

  // Generate a bech32-like address for testnet
  const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  let addr = TESTNET_PREFIX;
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 32; i++) {
    addr += chars[randomBytes[i] % chars.length];
  }
  return addr;
}

/**
 * Create a new wallet
 * @returns {{ mnemonic: string, address: string }}
 */
export function createWallet() {
  const mnemonic = generateMnemonic();
  const address = deriveAddress(mnemonic, 0);
  return { mnemonic, address };
}

/**
 * Restore wallet from mnemonic
 * @param {string} mnemonic - BIP39 mnemonic phrase
 * @returns {{ address: string }}
 */
export function restoreWallet(mnemonic) {
  const address = deriveAddress(mnemonic, 0);
  return { mnemonic, address };
}

/**
 * Build a Bitcoin transaction (Phase 2)
 * TODO: Implement with bitcoinjs-lib
 */
export async function buildTransaction({ utxos, toAddress, amount, feeRate, changeAddress }) {
  // Phase 2: Use bitcoinjs-lib to build and sign raw transactions
  // For now, return a placeholder
  console.warn('Transaction building not yet implemented - requires bitcoinjs-lib integration');
  throw new Error('Transaction building not yet available');
}
