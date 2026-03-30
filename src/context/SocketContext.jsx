import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../api/client';
import { WS_URL } from '../utils/constants';
import * as authApi from '../api/auth';

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
      // Connect without token in URL (auth-on-first-message pattern)
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send auth message immediately after connection opens
        const currentToken = getAccessToken();
        if (currentToken) {
          ws.send(JSON.stringify({ type: 'auth', token: currentToken }));
        } else {
          ws.close(4001, 'No token');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle auth responses
          if (data.type === 'auth_ok') {
            setConnected(true);
            setReconnecting(false);
            console.log('[WS] Authenticated');
            return;
          }

          if (data.type === 'auth_failed') {
            console.warn('[WS] Auth failed:', data.reason);
            ws.close();
            return;
          }

          // Handle periodic re-auth challenge from server
          if (data.type === 'auth_required') {
            (async () => {
              try {
                // Proactively refresh the access token first
                await authApi.refreshAccessToken();
                const freshToken = getAccessToken();
                if (freshToken && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'auth_renew', token: freshToken }));
                  console.log('[WS] Re-auth sent');
                }
              } catch (err) {
                console.error('[WS] Re-auth refresh failed:', err.message);
                ws.close();
              }
            })();
            return;
          }

          // Dispatch to registered listeners
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
