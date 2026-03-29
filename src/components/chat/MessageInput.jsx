import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Bitcoin, X, AlertCircle } from 'lucide-react';
import { loadWalletFromSession, isValidTestnetAddress, buildTransaction } from '../../crypto/btcWallet';
import { getUTXOs, broadcastTransaction, getBtcPrice, getTxUrl } from '../../api/bitcoin';
import toast from 'react-hot-toast';

export default function MessageInput({ onSend, recipientAddress }) {
  const [text, setText] = useState('');
  const [showBtcPanel, setShowBtcPanel] = useState(false);
  const [btcAmount, setBtcAmount] = useState('');
  const [sendingBtc, setSendingBtc] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSendBtc = async () => {
    const amount = parseFloat(btcAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const wallet = loadWalletFromSession();
    if (!wallet) {
      toast.error('Wallet not available');
      return;
    }

    const satoshis = Math.floor(amount * 100000000);
    setSendingBtc(true);

    try {
      // If we have a recipient BTC address, do a real transaction
      if (recipientAddress && isValidTestnetAddress(recipientAddress)) {
        const utxos = await getUTXOs(wallet.address);
        if (!utxos?.length) throw new Error('No funds available');

        const result = buildTransaction({
          utxos,
          toAddress: recipientAddress,
          amount: satoshis,
          feeRate: 1,
          changeAddress: wallet.address,
          privateKeyWIF: wallet.privateKey,
        });

        const txid = await broadcastTransaction(result.hex);
        const price = await getBtcPrice() || 0;
        const usdValue = (amount * price).toFixed(2);

        // Send as a payment message in the chat
        const paymentMsg = JSON.stringify({
          type: 'btc_payment',
          amount: amount.toFixed(8),
          usd: usdValue,
          txid: txid || result.txid,
          address: recipientAddress,
        });

        onSend(paymentMsg, 'btc_payment');
        toast.success(`Sent ${amount} BTC!`);
      } else {
        // No recipient address — send as a payment notification only
        const price = await getBtcPrice() || 0;
        const usdValue = (amount * price).toFixed(2);
        const paymentMsg = JSON.stringify({
          type: 'btc_payment',
          amount: amount.toFixed(8),
          usd: usdValue,
          txid: null,
          note: 'Recipient has no BTC address on file',
        });
        onSend(paymentMsg, 'btc_payment');
        toast('Payment request sent (no BTC address on file)', { icon: 'i' });
      }

      setBtcAmount('');
      setShowBtcPanel(false);
    } catch (err) {
      toast.error(err.message || 'BTC send failed');
    }
    setSendingBtc(false);
  };

  return (
    <div className="bg-white border-t border-phantom-gray-200">
      {/* BTC Payment Panel */}
      <AnimatePresence>
        {showBtcPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-3 pb-2">
              <div className="bg-phantom-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-phantom-charcoal flex items-center gap-1">
                    <Bitcoin className="w-3.5 h-3.5 text-amber-500" /> Send BTC
                  </span>
                  <button onClick={() => setShowBtcPanel(false)} className="p-1 hover:bg-phantom-gray-200 rounded-lg">
                    <X className="w-3.5 h-3.5 text-phantom-gray-400" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                    placeholder="0.00000000"
                    className="flex-1 bg-white rounded-lg px-3 py-2 text-sm font-mono border border-phantom-gray-200 focus:outline-none focus:border-phantom-green/50"
                    step="any"
                    min="0"
                  />
                  <span className="text-xs text-phantom-gray-400 font-semibold">BTC</span>
                  <button
                    onClick={handleSendBtc}
                    disabled={sendingBtc || !btcAmount}
                    className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {sendingBtc ? '...' : 'Send'}
                  </button>
                </div>
                {!recipientAddress && (
                  <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Recipient has no BTC address — payment notification only
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input */}
      <div className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <button type="button" className="w-10 h-10 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5 text-phantom-gray-400" />
          </button>
          <button
            type="button"
            onClick={() => setShowBtcPanel(!showBtcPanel)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${showBtcPanel ? 'bg-amber-50 text-amber-500' : 'hover:bg-phantom-gray-50 text-phantom-gray-400'}`}
          >
            <Bitcoin className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-phantom-gray-50 rounded-2xl px-4 py-3 pr-12 text-sm resize-none outline-none border border-transparent focus:border-phantom-green/30 transition-all max-h-32"
              rows={1}
              style={{ height: 'auto', minHeight: '44px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              text.trim()
                ? 'bg-phantom-green text-white hover:bg-phantom-green-dark shadow-green-glow/50 scale-100'
                : 'bg-phantom-gray-100 text-phantom-gray-300 scale-95'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
