export const API_URL = import.meta.env.VITE_API_URL || 'https://api.phantommessenger.app';
export const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.phantommessenger.app/ws';

export const TURN_CONFIG = {
  stun: 'stun:204.168.187.67:3478',
  turn: 'turn:204.168.187.67:3478',
  turns: 'turns:turn.phantommessenger.app:5349',
};

export const TIERS = {
  free: { name: 'Free', price: 0, maxContacts: 5, maxDailyMessages: 50 },
  essential: { name: 'Essential', price: 24.99, maxContacts: 50, unlimitedMessages: true },
  pro: { name: 'Pro', price: 149.99, unlimited: true },
};

export const MESSAGE_POLL_INTERVAL = 5000;
// Legacy — use getBlockstreamBase() from crypto/btcNetwork.js instead
export const BLOCKSTREAM_TESTNET_API = 'https://blockstream.info/testnet/api';
export const COINGECKO_API = 'https://api.coingecko.com/api/v3';
