import client from './client';
import { BLOCKSTREAM_TESTNET_API, COINGECKO_API } from '../utils/constants';
import axios from 'axios';

export async function getWalletBalance() {
  return client.get('/api/wallet/balance');
}

export async function getWalletPrice() {
  return client.get('/api/wallet/price');
}

export async function getSubscriptionStatus() {
  return client.get('/api/subscription/status');
}

export async function getBTCPrice() {
  return client.get('/api/subscription/btc-price');
}

// Blockstream testnet API (client-side, no auth needed)
export async function getAddressBalance(address) {
  const res = await axios.get(`${BLOCKSTREAM_TESTNET_API}/address/${address}`);
  const { funded_txo_sum, spent_txo_sum } = res.data.chain_stats;
  return { confirmed: funded_txo_sum - spent_txo_sum };
}

export async function getAddressTransactions(address) {
  const res = await axios.get(`${BLOCKSTREAM_TESTNET_API}/address/${address}/txs`);
  return res.data;
}

export async function broadcastTransaction(txHex) {
  const res = await axios.post(`${BLOCKSTREAM_TESTNET_API}/tx`, txHex, {
    headers: { 'Content-Type': 'text/plain' },
  });
  return res.data; // returns txid
}

export async function getUTXOs(address) {
  const res = await axios.get(`${BLOCKSTREAM_TESTNET_API}/address/${address}/utxo`);
  return res.data;
}

export async function getBTCPriceUSD() {
  try {
    const res = await axios.get(`${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd`);
    return res.data.bitcoin.usd;
  } catch {
    return 0;
  }
}

export async function getFeeEstimates() {
  try {
    const res = await axios.get(`${BLOCKSTREAM_TESTNET_API}/fee-estimates`);
    return {
      fast: Math.ceil(res.data['1'] || 20),
      medium: Math.ceil(res.data['6'] || 10),
      slow: Math.ceil(res.data['25'] || 5),
    };
  } catch {
    return { fast: 20, medium: 10, slow: 5 };
  }
}
