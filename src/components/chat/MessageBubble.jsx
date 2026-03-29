import { motion } from 'framer-motion';
import { Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import { formatMessageTime } from '../../utils/formatters';

export default function MessageBubble({ message, isMine, showTail }) {
  const { ciphertext, createdAt, pending, failed, delivered, read } = message;

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
        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{ciphertext}</p>
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
