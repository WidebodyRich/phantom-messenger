import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Bitcoin, RefreshCw, ExternalLink, Coins } from 'lucide-react';
import { getBalance, getTransactions, getBtcPrice, getAddressUrl, getTxUrl } from '../../api/bitcoin';
import { getNetworkLabel, isMainnet } from '../../crypto/btcNetwork';
import { formatBTC, formatUSD, truncateAddress } from '../../utils/formatters';
import { loadWalletFromSession } from '../../crypto/btcWallet';
import SendBTC from './SendBTC';
import ReceiveBTC from './ReceiveBTC';

export default function WalletView({ onClose }) {
  const [wallet] = useState(() => loadWalletFromSession());
  const [balance, setBalance] = useState({ confirmed: 0, unconfirmed: 0, total: 0, btc: 0 });
  const [btcPrice, setBtcPrice] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('main'); // main, send, receive

  const address = wallet?.address;

  const fetchData = useCallback(async () => {
    if (!address) { setLoading(false); return; }
    try {
      const [bal, price, txs] = await Promise.all([
        getBalance(address).catch(() => ({ confirmed: 0, unconfirmed: 0, total: 0, btc: 0 })),
        getBtcPrice().catch(() => 0),
        getTransactions(address).catch(() => []),
      ]);
      setBalance(bal);
      setBtcPrice(price || 0);
      setTransactions(txs.slice(0, 20));
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const usdBalance = balance.btc * btcPrice;

  if (view === 'send') {
    return <SendBTC wallet={wallet} balance={balance} btcPrice={btcPrice} onBack={() => { setView('main'); fetchData(); }} />;
  }
  if (view === 'receive') {
    return <ReceiveBTC address={address} onBack={() => setView('main')} />;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-phantom-charcoal">Bitcoin Wallet</h2>
        <button onClick={handleRefresh} disabled={refreshing} className="w-8 h-8 rounded-lg hover:bg-phantom-gray-50 flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 text-phantom-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-phantom-green to-emerald-700 rounded-2xl p-6 text-white mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Bitcoin className="w-5 h-5" />
              <span className="text-white/70 text-sm font-medium">Balance</span>
              <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${isMainnet() ? 'bg-red-500/60' : 'bg-white/20'}`}>{getNetworkLabel()}</span>
            </div>
            {loading ? (
              <div className="h-10 w-48 bg-white/20 rounded-xl animate-pulse mt-2" />
            ) : (
              <>
                <p className="text-3xl font-bold mt-2">{balance.btc.toFixed(8)} BTC</p>
                {btcPrice > 0 && <p className="text-white/70 text-sm mt-1">{formatUSD(usdBalance)}</p>}
                {balance.unconfirmed > 0 && (
                  <p className="text-white/50 text-xs mt-1">
                    +{(balance.unconfirmed / 100000000).toFixed(8)} BTC unconfirmed
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => setView('send')} className="bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97]">
            <div className="w-11 h-11 bg-phantom-green/10 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-phantom-green" />
            </div>
            <span className="text-sm font-semibold text-phantom-charcoal">Send</span>
          </button>
          <button onClick={() => setView('receive')} className="bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97]">
            <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-phantom-charcoal">Receive</span>
          </button>
          {!isMainnet() && (
            <a
              href="https://coinfaucet.eu/en/btc-testnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-phantom-gray-50 hover:bg-phantom-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
            >
              <div className="w-11 h-11 bg-amber-50 rounded-full flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-phantom-charcoal">Faucet</span>
            </a>
          )}
        </div>

        {/* Address */}
        {address && (
          <a
            href={getAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-phantom-gray-50 rounded-xl p-3 mb-6 hover:bg-phantom-gray-100 transition-colors"
          >
            <span className="text-xs font-mono text-phantom-gray-500 truncate flex-1">{address}</span>
            <ExternalLink className="w-3.5 h-3.5 text-phantom-gray-400 flex-shrink-0" />
          </a>
        )}

        {/* Transactions */}
        <h3 className="text-sm font-semibold text-phantom-charcoal mb-3">Recent Transactions</h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Bitcoin className="w-10 h-10 text-phantom-gray-200 mx-auto mb-2" />
            <p className="text-phantom-gray-400 text-sm">No transactions yet</p>
            {!isMainnet() ? (
              <>
                <p className="text-phantom-gray-300 text-xs mt-1">Get testnet BTC from the faucet above</p>
                <div className="flex flex-col gap-1 mt-3">
                  <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 text-phantom-green text-xs font-semibold hover:underline">
                    coinfaucet.eu <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href="https://bitcoinfaucet.uo1.net/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 text-phantom-green text-xs font-semibold hover:underline">
                    bitcoinfaucet.uo1.net <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            ) : (
              <p className="text-phantom-gray-300 text-xs mt-1">Send BTC to your address to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              // Determine if received: check if any output goes to our address
              const receivedAmount = tx.vout?.reduce(
                (sum, v) => v.scriptpubkey_address === address ? sum + v.value : sum, 0
              ) || 0;
              const sentAmount = tx.vin?.reduce(
                (sum, inp) => inp.prevout?.scriptpubkey_address === address ? sum + inp.prevout.value : sum, 0
              ) || 0;
              const isReceived = receivedAmount > sentAmount;
              const netAmount = isReceived ? receivedAmount : sentAmount - receivedAmount;
              const confirmations = tx.status?.confirmed ? (tx.status.block_height ? 'Confirmed' : 'Confirmed') : 'Pending';

              return (
                <a
                  key={tx.txid}
                  href={getTxUrl(tx.txid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-phantom-gray-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isReceived ? 'bg-green-50' : 'bg-red-50'}`}>
                    {isReceived ? <ArrowDownLeft className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-phantom-charcoal">{isReceived ? 'Received' : 'Sent'}</p>
                    <p className="text-xs text-phantom-gray-400 truncate">{truncateAddress(tx.txid, 10)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isReceived ? 'text-green-500' : 'text-red-500'}`}>
                      {isReceived ? '+' : '-'}{formatBTC(netAmount)}
                    </p>
                    <p className="text-xs text-phantom-gray-400">{confirmations}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
