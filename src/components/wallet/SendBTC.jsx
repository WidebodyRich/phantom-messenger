import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, ExternalLink, Zap, Clock, Turtle } from 'lucide-react';
import { getUTXOs, broadcastTransaction, getFeeEstimate, getTxUrl } from '../../api/bitcoin';
import { buildTransaction, isValidTestnetAddress } from '../../crypto/btcWallet';
import { formatBTC, formatUSD } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function SendBTC({ wallet, balance, btcPrice, onBack }) {
  const [step, setStep] = useState('input');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountMode, setAmountMode] = useState('btc');
  const [feePriority, setFeePriority] = useState('medium');
  const [fees, setFees] = useState({ low: 1, medium: 1, high: 2 });
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState(null);
  const [sending, setSending] = useState(false);

  const btcAmount = amountMode === 'btc'
    ? parseFloat(amount) || 0
    : btcPrice > 0 ? (parseFloat(amount) || 0) / btcPrice : 0;
  const satoshis = Math.floor(btcAmount * 100000000);
  const usdAmount = btcAmount * btcPrice;
  const feeRate = fees[feePriority] || 1;
  const estimatedFee = Math.ceil(140 * feeRate);
  const estimatedFeeBtc = estimatedFee / 100000000;

  const handleReview = async () => {
    setError('');
    if (!toAddress.trim()) { setError('Enter a recipient address'); return; }
    if (!isValidTestnetAddress(toAddress.trim())) { setError('Invalid Bitcoin testnet address'); return; }
    if (satoshis <= 0) { setError('Enter a valid amount'); return; }
    if (satoshis + estimatedFee > balance.total) { setError('Insufficient funds'); return; }
    try { const f = await getFeeEstimate(); setFees(f); } catch {}
    setStep('confirm');
  };

  const handleSendMax = () => {
    const maxSats = balance.total - estimatedFee;
    if (maxSats > 0) { setAmount((maxSats / 100000000).toFixed(8)); setAmountMode('btc'); }
  };

  const handleConfirmSend = async () => {
    setSending(true);
    setError('');
    try {
      const utxos = await getUTXOs(wallet.address);
      if (!utxos?.length) throw new Error('No unspent outputs available');
      const result = buildTransaction({
        utxos, toAddress: toAddress.trim(), amount: satoshis,
        feeRate: fees[feePriority] || 1, changeAddress: wallet.address, privateKeyWIF: wallet.privateKey,
      });
      const txid = await broadcastTransaction(result.hex);
      setTxResult({ txid: txid || result.txid, amount: satoshis, fee: result.fee, toAddress: toAddress.trim() });
      setStep('success');
      toast.success('Transaction broadcast!');
    } catch (err) {
      setError(err.message || 'Transaction failed');
      setStep('error');
    }
    setSending(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={step === 'input' ? onBack : () => setStep('input')} className="w-8 h-8 rounded-lg hover:bg-phantom-gray-50 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Send Bitcoin</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-phantom-charcoal mb-2">Recipient Address</label>
                <input type="text" value={toAddress} onChange={(e) => { setToAddress(e.target.value); setError(''); }}
                  placeholder="tb1q..." className="input-field font-mono text-sm" spellCheck={false} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-phantom-charcoal">Amount</label>
                  <div className="flex bg-phantom-gray-50 rounded-lg p-0.5">
                    {['btc','usd'].map(m => (
                      <button key={m} onClick={() => setAmountMode(m)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${amountMode === m ? 'bg-white text-phantom-charcoal shadow-sm' : 'text-phantom-gray-400'}`}>
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                    placeholder="0.00" className="input-field pr-16" step="any" min="0" />
                  <button onClick={handleSendMax}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-phantom-green hover:text-phantom-green/80 px-2 py-1 bg-phantom-green/5 rounded-md">
                    MAX
                  </button>
                </div>
                {btcAmount > 0 && <p className="text-xs text-phantom-gray-400 mt-1">{amountMode === 'btc' ? formatUSD(usdAmount) : `${btcAmount.toFixed(8)} BTC`}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-phantom-charcoal mb-2">Network Fee</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ key: 'low', label: 'Economy', icon: Turtle, desc: '~60 min' },
                    { key: 'medium', label: 'Normal', icon: Clock, desc: '~30 min' },
                    { key: 'high', label: 'Fast', icon: Zap, desc: '~10 min' }].map(({ key, label, icon: Icon, desc }) => (
                    <button key={key} onClick={() => setFeePriority(key)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${feePriority === key ? 'border-phantom-green bg-phantom-green/5' : 'border-phantom-gray-100 hover:border-phantom-gray-200'}`}>
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${feePriority === key ? 'text-phantom-green' : 'text-phantom-gray-400'}`} />
                      <p className="text-xs font-semibold text-phantom-charcoal">{label}</p>
                      <p className="text-[10px] text-phantom-gray-400">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-phantom-gray-50 rounded-xl p-3 flex justify-between">
                <span className="text-xs text-phantom-gray-500">Available</span>
                <span className="text-xs font-semibold text-phantom-charcoal">{balance.btc.toFixed(8)} BTC</span>
              </div>
              {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</motion.div>}
              <button onClick={handleReview} className="btn-primary w-full flex items-center justify-center gap-2">Review Transaction <ArrowRight className="w-4 h-4" /></button>
            </motion.div>
          )}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-phantom-gray-50 rounded-2xl p-5 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-phantom-gray-500">Sending</p>
                  <p className="text-3xl font-bold text-phantom-charcoal mt-1">{btcAmount.toFixed(8)} BTC</p>
                  {btcPrice > 0 && <p className="text-sm text-phantom-gray-400 mt-1">{formatUSD(usdAmount)}</p>}
                </div>
                <div className="border-t border-phantom-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between"><span className="text-xs text-phantom-gray-500">To</span><span className="text-xs font-mono text-phantom-charcoal max-w-[200px] truncate">{toAddress}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-phantom-gray-500">Network Fee</span><span className="text-xs font-semibold text-phantom-charcoal">{estimatedFeeBtc.toFixed(8)} BTC</span></div>
                  <div className="flex justify-between border-t border-phantom-gray-200 pt-3"><span className="text-xs font-semibold text-phantom-charcoal">Total</span><span className="text-xs font-bold text-phantom-charcoal">{(btcAmount + estimatedFeeBtc).toFixed(8)} BTC</span></div>
                </div>
              </div>
              <button onClick={handleConfirmSend} disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
                {sending ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Broadcasting...</> : 'Confirm & Send'}
              </button>
            </motion.div>
          )}
          {step === 'success' && txResult && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-phantom-green/10 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8 text-phantom-green" /></div>
              <div><h3 className="text-xl font-bold text-phantom-charcoal">Sent!</h3><p className="text-sm text-phantom-gray-500 mt-1">{formatBTC(txResult.amount)} sent successfully</p></div>
              <a href={getTxUrl(txResult.txid)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-phantom-green font-semibold hover:underline">View on Block Explorer <ExternalLink className="w-4 h-4" /></a>
              <button onClick={onBack} className="btn-primary w-full mt-4">Done</button>
            </motion.div>
          )}
          {step === 'error' && (
            <motion.div key="error" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto"><AlertCircle className="w-8 h-8 text-red-500" /></div>
              <div><h3 className="text-xl font-bold text-phantom-charcoal">Transaction Failed</h3><p className="text-sm text-red-500 mt-2">{error}</p></div>
              <button onClick={() => setStep('input')} className="btn-primary w-full">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
