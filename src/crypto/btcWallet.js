/**
 * Bitcoin HD Wallet (Testnet)
 * BIP39 Mnemonic -> BIP84 Native SegWit (tb1...) derivation
 * Full non-custodial wallet with transaction building
 */
import * as bip39 from 'bip39';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);
const network = bitcoin.networks.testnet;

/**
 * Generate a new HD wallet (BIP84 native SegWit, testnet)
 */
export function generateWallet() {
  const mnemonic = bip39.generateMnemonic(128);
  return deriveWalletFromMnemonic(mnemonic);
}

/**
 * Restore a wallet from a mnemonic phrase
 */
export function restoreWalletFromMnemonic(mnemonic) {
  const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!bip39.validateMnemonic(cleaned)) {
    throw new Error('Invalid seed phrase');
  }
  return deriveWalletFromMnemonic(cleaned);
}

/**
 * Derive wallet keys from mnemonic
 */
function deriveWalletFromMnemonic(mnemonic) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, network);
  // BIP84 path for testnet native SegWit: m/84'/1'/0'/0/0
  const path = "m/84'/1'/0'/0/0";
  const child = root.derivePath(path);

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network,
  });

  return {
    mnemonic,
    address,
    privateKey: child.toWIF(),
    publicKey: Buffer.from(child.publicKey).toString('hex'),
  };
}

/**
 * Validate a Bitcoin testnet address
 */
export function isValidTestnetAddress(addr) {
  try {
    bitcoin.address.toOutputScript(addr, network);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build and sign a Bitcoin transaction
 * @param {Object} params
 * @param {Array} params.utxos - Unspent transaction outputs [{txid, vout, value, status}]
 * @param {string} params.toAddress - Recipient address
 * @param {number} params.amount - Amount in satoshis
 * @param {number} params.feeRate - Fee rate in sat/vB
 * @param {string} params.changeAddress - Change address (sender's address)
 * @param {string} params.privateKeyWIF - Sender's private key in WIF format
 * @returns {string} Raw transaction hex ready to broadcast
 */
export function buildTransaction({ utxos, toAddress, amount, feeRate, changeAddress, privateKeyWIF }) {
  const keyPair = ECPair.fromWIF(privateKeyWIF, network);
  const psbt = new bitcoin.Psbt({ network });

  // Sort UTXOs by value descending for coin selection
  const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

  let inputSum = 0;
  const selectedUtxos = [];

  // Estimate tx size: ~68 vBytes per input + ~31 vBytes per output + ~10 overhead
  // We'll start with an estimate and refine
  const estimateSize = (inputs, outputs) => inputs * 68 + outputs * 31 + 10;

  // Select UTXOs to cover amount + estimated fee
  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    inputSum += utxo.value;
    const estSize = estimateSize(selectedUtxos.length, 2); // 2 outputs: recipient + change
    const estFee = Math.ceil(estSize * feeRate);
    if (inputSum >= amount + estFee) break;
  }

  // Calculate final fee
  const hasChange = true;
  const txSize = estimateSize(selectedUtxos.length, hasChange ? 2 : 1);
  const fee = Math.ceil(txSize * feeRate);

  if (inputSum < amount + fee) {
    throw new Error(`Insufficient funds. Have ${inputSum} sats, need ${amount + fee} sats (${amount} + ${fee} fee)`);
  }

  // Add inputs
  const p2wpkh = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network,
  });

  for (const utxo of selectedUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: p2wpkh.output,
        value: utxo.value,
      },
    });
  }

  // Add recipient output
  psbt.addOutput({
    address: toAddress,
    value: amount,
  });

  // Add change output if there's enough change (dust threshold = 546 sats)
  const change = inputSum - amount - fee;
  if (change > 546) {
    psbt.addOutput({
      address: changeAddress,
      value: change,
    });
  }

  // Sign all inputs
  for (let i = 0; i < selectedUtxos.length; i++) {
    psbt.signInput(i, keyPair);
  }

  // Finalize and extract
  psbt.finalizeAllInputs();
  const tx = psbt.extractTransaction();

  return {
    hex: tx.toHex(),
    txid: tx.getId(),
    fee,
    size: tx.virtualSize(),
  };
}

/**
 * Encrypt wallet data for localStorage
 */
export function encryptWalletData(walletData) {
  // Simple obfuscation for localStorage (not true encryption)
  return btoa(JSON.stringify(walletData));
}

/**
 * Decrypt wallet data from localStorage
 */
export function decryptWalletData(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

/**
 * Save wallet to localStorage
 */
export async function saveWalletToSession(wallet) {
  const { vaultSet } = await import('./vault');
  await vaultSet('phantom_wallet', encryptWalletData(wallet));
}

/**
 * Load wallet from localStorage (sync fallback for Settings page)
 */
export function loadWalletFromSession() {
  const data = localStorage.getItem('phantom_wallet');
  if (!data) return null;
  // Handle vault-encrypted values — can't decrypt sync, return null
  if (data.startsWith('v1:')) return null;
  return decryptWalletData(data);
}

/**
 * Load wallet from localStorage (async, vault-aware)
 */
export async function loadWalletFromSessionAsync() {
  const { vaultGet } = await import('./vault');
  const data = await vaultGet('phantom_wallet');
  if (!data) return null;
  return decryptWalletData(data);
}

/**
 * Clear wallet from localStorage
 */
export function clearWalletFromSession() {
  localStorage.removeItem('phantom_wallet');
}
