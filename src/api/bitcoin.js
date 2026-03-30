/**
 * Bitcoin Blockchain API (Blockstream — Mainnet / Testnet)
 * No API key required
 */
import { getBlockstreamBase, getExplorerTxUrl, getExplorerAddressUrl } from '../crypto/btcNetwork';

export async function getBalance(address) {
  const res = await fetch(`${getBlockstreamBase()}/address/${address}`);
  if (!res.ok) throw new Error('Failed to fetch balance');
  const data = await res.json();
  const confirmed = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  const unconfirmed = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
  return {
    confirmed,
    unconfirmed,
    total: confirmed + unconfirmed,
    btc: (confirmed + unconfirmed) / 100000000,
  };
}

export async function getTransactions(address) {
  const res = await fetch(`${getBlockstreamBase()}/address/${address}/txs`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return await res.json();
}

export async function getUTXOs(address) {
  const res = await fetch(`${getBlockstreamBase()}/address/${address}/utxo`);
  if (!res.ok) throw new Error('Failed to fetch UTXOs');
  return await res.json();
}

export async function broadcastTransaction(txHex) {
  const res = await fetch(`${getBlockstreamBase()}/tx`, {
    method: 'POST',
    body: txHex,
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.text(); // returns txid
}

export async function getFeeEstimate() {
  const res = await fetch(`${getBlockstreamBase()}/fee-estimates`);
  if (!res.ok) return { '1': 2, '3': 1, '6': 1 }; // fallback
  const data = await res.json();
  return {
    high: Math.max(data['1'] || 2, 1),
    medium: Math.max(data['3'] || 1, 1),
    low: Math.max(data['6'] || 1, 1),
  };
}

export async function getBtcPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!res.ok) return null;
    const data = await res.json();
    return data.bitcoin.usd;
  } catch {
    return null;
  }
}

export function getTxUrl(txid) {
  return getExplorerTxUrl(txid);
}

export function getAddressUrl(address) {
  return getExplorerAddressUrl(address);
}
