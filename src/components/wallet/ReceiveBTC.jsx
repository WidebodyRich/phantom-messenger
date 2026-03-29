import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function ReceiveBTC({ address, onBack }) {
  const [copied, setCopied] = useState(false);

  const displayAddress = address || 'tb1q_generate_address_on_registration';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Receive Bitcoin</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl shadow-card border border-phantom-gray-200 mb-6">
          <QRCodeSVG
            value={`bitcoin:${displayAddress}`}
            size={200}
            bgColor="#FFFFFF"
            fgColor="#1A1A2E"
            level="M"
            includeMargin={false}
          />
        </motion.div>

        <p className="text-xs text-phantom-gray-400 mb-2">Your Bitcoin testnet address</p>
        <div className="bg-phantom-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 max-w-full">
          <code className="text-xs text-phantom-charcoal font-mono truncate flex-1">{displayAddress}</code>
          <button onClick={handleCopy} className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-phantom-gray-100 flex items-center justify-center transition-all">
            {copied ? <Check className="w-4 h-4 text-phantom-green" /> : <Copy className="w-4 h-4 text-phantom-gray-400" />}
          </button>
        </div>

        <p className="text-xs text-phantom-gray-300 mt-4 text-center max-w-xs">
          Send only Bitcoin testnet (tBTC) to this address. Mainnet BTC sent here will be lost.
        </p>
      </div>
    </div>
  );
}
