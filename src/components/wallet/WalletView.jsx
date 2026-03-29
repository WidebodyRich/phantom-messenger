import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Bitcoin, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { getBTCPriceUSD, getAddressBalance, getAddressTransactions } from '../../api/wallet';
import { formatBTC, formatUSD, truncateAddress } from '../../utils/formatters';
import SendBTC from './SendBTC';
import ReceiveBTC from './ReceiveBTC';
import toast from 'react-hot-toast';

export default function WalletView({ address, onClose }) {
  const [balance, setBalance] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('main'); // main, send, receive

  const fetchData = useCallback(async () => {
    try {
      const [bal, price, txs] = await Promise.all([
        address ? getAddressBalance(address).catch(() => ({ confirmed: 0 })) : { confirmed: 0 },
        getBTCPriceUSD(),
        address ? getAddressTransactions(address).catch(() => []) : [],
      ]);
      setBalance(bal.confirmed || 0);
      setBtcPrice(price);
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

  const btcBalance = balance / 100000000;
  const usdBalance = btcBalance * btcPrice;

  if (view === 'send') return <SendBTC address={address} balance={balance} btcPrice={btcPrice} onBack={() => setView('main')} />;
  if (view === 'receive') return <ReceiveBTC address={address} onBack={() => setView('main')} />;

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
          className="bg-gradient-to-br from-phantom-green to-phantom-green-dark rounded-2xl p-6 text-white mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Bitcoin className="w-5 h-5" />
              <span className="text-white/70 text-sm font-medium">Balance</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">TESTNET</span>
            </div>
            {loading ? (
              <div className="h-10 w-48 bg-white/20 rounded-xl animate-pulse mt-2" />
            ) : (
              <>
                <p className="text-3xl font-bold mt-2">{btcBalance.toFixed(8)} BTC</p>
                <p className="text-white/70 text-sm mt-1">{formatUSD(usdBalance)}</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
        </div>

        {/* Transactions */}
        <h3 className="text-sm font-semibold text-phantom-charcoal mb-3">Recent Transactions</h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 skeleton" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Bitcoin className="w-10 h-10 text-phantom-gray-200 mx-auto mb-2" />
            <p className="text-phantom-gray-400 text-sm">No transactions yet</p>
            <p className="text-phantom-gray-300 text-xs mt-1">Get some testnet BTC to get started</p>
            <a
              href="https://coinfaucet.eu/en/btc-testnet/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-phantom-green text-xs font-semibold mt-3 hover:underline"
            >
              Get Test Coins <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isReceived = tx.vout?.some(v => v.scriptpubkey_address === address);
              const amount = tx.vout?.reduce((sum, v) => v.scriptpubkey_address === address ? sum + v.value : sum, 0) || 0;
              return (
                <div key={tx.txid} className="flex items-center gap-3 p-3 rounded-xl hover:bg-phantom-gray-50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isReceived ? 'bg-green-50' : 'bg-red-50'}`}>
                    {isReceived ? <ArrowDownLeft className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-phantom-charcoal">{isReceived ? 'Received' : 'Sent'}</p>
                    <p className="text-xs text-phantom-gray-400 truncate">{truncateAddress(tx.txid, 10)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isReceived ? 'text-green-500' : 'text-red-500'}`}>
                      {isReceived ? '+' : '-'}{formatBTC(amount)}
                    </p>
                    <p className="text-xs text-phantom-gray-400">{tx.status?.confirmed ? 'Confirmed' : 'Pending'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
