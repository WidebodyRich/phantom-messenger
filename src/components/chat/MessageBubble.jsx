import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, AlertCircle, Clock, Bitcoin, ExternalLink, FileText, Download, Image as ImageIcon, X } from 'lucide-react';
import { formatMessageTime } from '../../utils/formatters';
import { getTxUrl } from '../../api/bitcoin';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function BtcPaymentCard({ data, isMine }) {
  let parsed;
  try { parsed = JSON.parse(data); } catch { return <p className="text-[15px]">{data}</p>; }

  return (
    <div className={`rounded-xl p-3 ${isMine ? 'bg-white/15' : 'bg-phantom-green/10'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-amber-100'}`}>
          <Bitcoin className={`w-4 h-4 ${isMine ? 'text-white' : 'text-amber-500'}`} />
        </div>
        <div>
          <p className={`text-sm font-bold ${isMine ? 'text-white' : 'text-phantom-charcoal'}`}>
            {parsed.amount} BTC
          </p>
          {parsed.usd && parsed.usd !== '0.00' && (
            <p className={`text-xs ${isMine ? 'text-white/70' : 'text-phantom-gray-400'}`}>~${parsed.usd} USD</p>
          )}
        </div>
      </div>
      {parsed.txid && (
        <a
          href={getTxUrl(parsed.txid)}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-xs font-semibold ${isMine ? 'text-white/80 hover:text-white' : 'text-phantom-green hover:underline'}`}
        >
          View Transaction <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {!parsed.txid && parsed.note && (
        <p className={`text-xs ${isMine ? 'text-white/60' : 'text-phantom-gray-400'}`}>{parsed.note}</p>
      )}
    </div>
  );
}

function AttachmentCard({ data, isMine }) {
  const [lightbox, setLightbox] = useState(false);
  let parsed;
  try { parsed = JSON.parse(data); } catch { return <p className="text-[15px]">{data}</p>; }

  const isImage = parsed.fileType?.startsWith('image/');
  const url = parsed.url;

  if (isImage && url) {
    return (
      <>
        <div className="rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightbox(true)}>
          <img
            src={url}
            alt={parsed.fileName || 'Image'}
            className="max-w-full max-h-64 object-cover rounded-xl"
            loading="lazy"
          />
          {parsed.caption && (
            <p className="text-[15px] leading-relaxed mt-2 break-words whitespace-pre-wrap">{parsed.caption}</p>
          )}
        </div>
        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
            <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors" onClick={() => setLightbox(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
            <img src={url} alt={parsed.fileName || 'Image'} className="max-w-[90vw] max-h-[90vh] object-contain" />
          </div>
        )}
      </>
    );
  }

  // Non-image file
  return (
    <div className={`rounded-xl p-3 ${isMine ? 'bg-white/15' : 'bg-phantom-gray-50 border border-phantom-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-phantom-gray-100'}`}>
          <FileText className={`w-5 h-5 ${isMine ? 'text-white' : 'text-phantom-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-phantom-charcoal'}`}>
            {parsed.fileName || 'File'}
          </p>
          <p className={`text-xs ${isMine ? 'text-white/60' : 'text-phantom-gray-400'}`}>
            {formatFileSize(parsed.fileSize)}
          </p>
        </div>
        {url && (
          <a
            href={url}
            download={parsed.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-lg transition-colors ${isMine ? 'hover:bg-white/20' : 'hover:bg-phantom-gray-100'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Download className={`w-4 h-4 ${isMine ? 'text-white' : 'text-phantom-green'}`} />
          </a>
        )}
      </div>
      {parsed.caption && (
        <p className="text-[15px] leading-relaxed mt-2 break-words whitespace-pre-wrap">{parsed.caption}</p>
      )}
    </div>
  );
}

export default function MessageBubble({ message, isMine, showTail }) {
  const { ciphertext, plaintext, displayText, messageType, createdAt, pending, failed, delivered, read } = message;
  const text = displayText || plaintext || ciphertext;

  // System messages (screenshot alerts, etc) render as centered banners
  if (messageType === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="bg-amber-50 text-amber-700 text-xs font-medium px-4 py-1.5 rounded-full border border-amber-200">
          {text}
        </span>
      </div>
    );
  }

  // Check message types
  const isBtcPayment = messageType === 'btc_payment' || (() => {
    try { const p = JSON.parse(text); return p.type === 'btc_payment'; } catch { return false; }
  })();

  const isAttachment = messageType === 'image' || messageType === 'file' || messageType === 'video' || messageType === 'audio' || (() => {
    try { const p = JSON.parse(text); return p.type === 'attachment'; } catch { return false; }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-3' : 'mt-0.5'}`}
    >
      <div
        className={`max-w-[75%] md:max-w-[60%] px-4 py-2.5 ${
          isMine
            ? 'bg-phantom-green text-white rounded-2xl rounded-br-md'
            : 'bg-white text-phantom-charcoal rounded-2xl rounded-bl-md shadow-soft border border-phantom-gray-200/50'
        }`}
      >
        {isBtcPayment ? (
          <BtcPaymentCard data={text} isMine={isMine} />
        ) : isAttachment ? (
          <AttachmentCard data={text} isMine={isMine} />
        ) : (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{text}</p>
        )}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/60' : 'text-phantom-gray-400'}`}>
          <span className="text-[10px]">{formatMessageTime(createdAt)}</span>
          {isMine && (
            <>
              {failed ? (
                <AlertCircle className="w-3 h-3 text-red-300" />
              ) : pending ? (
                <Clock className="w-3 h-3" />
              ) : read ? (
                <CheckCheck className="w-3 h-3 text-blue-300" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
