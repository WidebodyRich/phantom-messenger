import { MessageCircle, Shield, Lock } from 'lucide-react';

export default function EmptyChat() {
  return (
    <div className="h-full flex items-center justify-center bg-phantom-gray-50/50">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-phantom-green/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="w-10 h-10 text-phantom-green" />
        </div>
        <h2 className="text-xl font-bold text-phantom-charcoal mb-2">Phantom Messenger</h2>
        <p className="text-phantom-gray-400 text-sm leading-relaxed mb-6">
          Select a conversation from the sidebar or start a new chat to begin messaging.
        </p>
        <div className="flex items-center justify-center gap-2 text-phantom-gray-300 text-xs">
          <Lock className="w-3.5 h-3.5" />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
