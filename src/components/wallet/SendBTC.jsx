import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bitcoin, ArrowUpRight } from 'lucide-react';
import { formatBTC, formatUSD } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function SendBTC({ address, balance, btcPrice, onBack }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState('btc'); // btc or usd
  const [step, setStep] = useState('input'); // input, confirm, success
  const [sending, setSending] = useState(false);

  const btcAmount = amountType === 'btc' ? parseFloat(amount) || 0 : (parseFloat(amount) || 0) / btcPrice;
  const usdAmount = amountType === 'usd' ? parseFloat(amount) || 0 : btcAmount * btcPrice;
  const satsAmount = Math.round(btcAmount * 100000000);

  const handleConfirm = async () => {
    setSending(true);
    // TODO: Build and broadcast real transaction with bitcoinjs-lib
    setTimeout(() => {
      setSending(false);
      setStep('success');
      toast.success('Transaction sent!');
    }, 2000);
  };

  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-20 h-20 bg-phantom-green/10 rounded-full flex items-center justify-center mb-6">
          <ArrowUpRight className="w-10 h-10 text-phantom-green" />
        </motion.div>
        <h2 className="text-xl font-bold text-phantom-charcoal mb-2">Sent!</h2>
        <p className="text-phantom-gray-400 text-sm mb-1">{btcAmount.toFixed(8)} BTC</p>
        <p className="text-phantom-gray-300 text-xs mb-8">{formatUSD(usdAmount)}</p>
        <button onClick={onBack} className="btn-primary">Done</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Send Bitcoin</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        {step === 'input' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-phantom-charcoal mb-2">To</label>
              <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="BTC address or username" className="input-field font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-phantom-charcoal mb-2">Amount</label>
              <div className="relative">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input-field text-2xl font-bold text-center pr-20" step="any" />
                <button onClick={() => setAmountType(amountType === 'btc' ? 'usd' : 'btc')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-phantom-gray-100 hover:bg-phantom-gray-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                  {amountType === 'btc' ? 'BTC' : 'USD'}
                </button>
              </div>
              <p className="text-center text-xs text-phantom-gray-400 mt-2">
                {amountType === 'btc' ? `≈ ${formatUSD(usdAmount)}` : `≈ ${btcAmount.toFixed(8)} BTC`}
              </p>
              <p className="text-center text-xs text-phantom-gray-300 mt-1">
                Available: {formatBTC(balance)}
              </p>
            </div>
            <button onClick={() => setStep('confirm')} disabled={!recipient || !amount || satsAmount <= 0 || satsAmount > balance} className="btn-primary w-full">
              Review
            </button>
          </>
        ) : (
          <>
            <div className="card space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-phantom-gray-400">To</span>
                <span className="text-sm font-mono text-phantom-charcoal">{recipient.length > 20 ? recipient.slice(0, 10) + '...' + recipient.slice(-10) : recipient}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-phantom-gray-400">Amount</span>
                <span className="text-sm font-bold text-phantom-charcoal">{btcAmount.toFixed(8)} BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-phantom-gray-400">USD Value</span>
                <span className="text-sm text-phantom-gray-500">{formatUSD(usdAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-phantom-gray-400">Network Fee</span>
                <span className="text-sm text-phantom-gray-500">~0.00001 BTC</span>
              </div>
              <hr className="border-phantom-gray-200" />
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-phantom-charcoal">Total</span>
                <span className="text-sm font-bold text-phantom-green">{(btcAmount + 0.00001).toFixed(8)} BTC</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('input')} className="btn-secondary flex-1">Back</button>
              <button onClick={handleConfirm} disabled={sending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
