import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getAddressUrl } from '../../api/bitcoin';
import toast from 'react-hot-toast';

export default function ReceiveBTC({ address, onBack }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Bitcoin Address', text: address });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg hover:bg-phantom-gray-50 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-phantom-gray-500" />
        </button>
        <h2 className="text-lg font-bold text-phantom-charcoal">Receive Bitcoin</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          {/* QR Code */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-phantom-gray-100 mb-6">
            <QRCodeSVG
              value={`bitcoin:${address}`}
              size={200}
              bgColor="#ffffff"
              fgColor="#1a1a2e"
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Address */}
          <div className="w-full bg-phantom-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-phantom-gray-400 mb-2 text-center">Your Bitcoin Testnet Address</p>
            <p className="text-sm font-mono text-phantom-charcoal text-center break-all leading-relaxed">
              {address}
            </p>
          </div>

          {/* Actions */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 bg-phantom-green text-white font-semibold rounded-xl hover:bg-phantom-green/90 transition-colors"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 bg-phantom-gray-100 text-phantom-charcoal font-semibold rounded-xl hover:bg-phantom-gray-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Share
            </button>
          </div>

          {/* Info */}
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Testnet Only:</span> This address is for Bitcoin testnet. Do not send real Bitcoin to this address. Get free testnet BTC from a{' '}
              <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                faucet
              </a>.
            </p>
          </div>

          {/* Block Explorer Link */}
          <a
            href={getAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-phantom-green font-semibold mt-4 hover:underline"
          >
            View on Block Explorer <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
