import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, DollarSign } from 'lucide-react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  return (
    <div className="px-4 py-3 bg-white border-t border-phantom-gray-200">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <button type="button" className="w-10 h-10 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors flex-shrink-0">
          <Paperclip className="w-5 h-5 text-phantom-gray-400" />
        </button>
        <button type="button" className="w-10 h-10 rounded-xl hover:bg-phantom-gray-50 flex items-center justify-center transition-colors flex-shrink-0">
          <DollarSign className="w-5 h-5 text-phantom-gray-400" />
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
  );
}
