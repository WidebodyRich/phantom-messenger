/**
 * Bitcoin Network Configuration
 *
 * Single source of truth for mainnet/testnet toggle.
 * Persisted in localStorage so it survives page reloads.
 */
import * as bitcoin from 'bitcoinjs-lib';

const STORAGE_KEY = 'phantom_btc_network';

/**
 * Get the current network setting.
 * @returns {'mainnet' | 'testnet'}
 */
export function getBtcNetwork() {
  return localStorage.getItem(STORAGE_KEY) || 'testnet';
}

/**
 * Set the network.
 * @param {'mainnet' | 'testnet'} network
 */
export function setBtcNetwork(network) {
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error('Invalid network: must be "mainnet" or "testnet"');
  }
  localStorage.setItem(STORAGE_KEY, network);
}

/**
 * Check if currently on mainnet.
 */
export function isMainnet() {
  return getBtcNetwork() === 'mainnet';
}

/**
 * Get the bitcoinjs-lib network object.
 */
export function getNetworkObj() {
  return isMainnet() ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
}

/**
 * Get BIP84 derivation path for current network.
 * Mainnet: m/84'/0'/0'/0/0
 * Testnet: m/84'/1'/0'/0/0
 */
export function getDerivationPath() {
  return isMainnet() ? "m/84'/0'/0'/0/0" : "m/84'/1'/0'/0/0";
}

/**
 * Get Blockstream API base URL.
 */
export function getBlockstreamBase() {
  return isMainnet()
    ? 'https://blockstream.info/api'
    : 'https://blockstream.info/testnet/api';
}

/**
 * Get block explorer URL for a transaction.
 */
export function getExplorerTxUrl(txid) {
  return isMainnet()
    ? `https://blockstream.info/tx/${txid}`
    : `https://blockstream.info/testnet/tx/${txid}`;
}

/**
 * Get block explorer URL for an address.
 */
export function getExplorerAddressUrl(address) {
  return isMainnet()
    ? `https://blockstream.info/address/${address}`
    : `https://blockstream.info/testnet/address/${address}`;
}

/**
 * Get the network display label.
 */
export function getNetworkLabel() {
  return isMainnet() ? 'MAINNET' : 'TESTNET';
}

/**
 * Get the address prefix hint for the placeholder.
 */
export function getAddressPlaceholder() {
  return isMainnet() ? 'bc1q...' : 'tb1q...';
}
