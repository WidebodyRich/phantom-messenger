import { useChat } from '../context/ChatContext';

export function useMessages(conversationId) {
  const { messages, sendMessage } = useChat();
  const conversationMessages = messages[conversationId] || [];

  return {
    messages: conversationMessages,
    send: (text) => sendMessage(conversationId, text),
    loading: false,
  };
}
