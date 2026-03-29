import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/client';
import { WS_URL } from '../utils/constants';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const listeners = useRef(new Map());

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token || !user) return;

    try {
      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setReconnecting(false);
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handlers = listeners.current.get(data.type) || [];
          handlers.forEach((handler) => handler(data));
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect after 3 seconds
        if (user) {
          setReconnecting(true);
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      setReconnecting(true);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [user]);

  useEffect(() => {
    if (user) connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [user, connect]);

  const send = useCallback((type, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  const on = useCallback((type, handler) => {
    const handlers = listeners.current.get(type) || [];
    handlers.push(handler);
    listeners.current.set(type, handlers);
    return () => {
      const updated = (listeners.current.get(type) || []).filter((h) => h !== handler);
      listeners.current.set(type, updated);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected, reconnecting, send, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
