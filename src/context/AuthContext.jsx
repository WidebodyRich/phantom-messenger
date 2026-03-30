import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { setAccessToken } from '../api/client';
import * as authApi from '../api/auth';
import { restoreEncryptionState, clearEncryptionState } from '../crypto/signalProtocol';
import { clearWalletFromSession } from '../crypto/btcWallet';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res.success) {
        setUser(res.data);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Try to restore session — refresh token is in httpOnly cookie (sent automatically)
      try {
        await authApi.refreshAccessToken();
        await fetchUser();
        // Restore Signal Protocol state
        await restoreEncryptionState();
      } catch {
        // No valid session — user will need to log in
      }
      setLoading(false);
    };
    init();
  }, [fetchUser]);

  // Proactive token refresh — fires every 10 minutes (before 15-min access token expires)
  // Also refreshes when the page regains visibility (mobile tab wakeup)
  useEffect(() => {
    if (!user) return;

    const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

    const refreshTimer = setInterval(async () => {
      try {
        await authApi.refreshAccessToken();
        console.log('[Auth] Proactive token refresh OK');
      } catch (err) {
        console.warn('[Auth] Proactive refresh failed:', err.message);
      }
    }, REFRESH_INTERVAL);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        try {
          await authApi.refreshAccessToken();
          console.log('[Auth] Visibility-triggered refresh OK');
        } catch (err) {
          console.warn('[Auth] Visibility refresh failed:', err.message);
          // If refresh fails completely, force logout
          setAccessToken(null);
          setUser(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Unified register — works for all auth methods
  const register = async (data) => {
    const res = await authApi.register(data);
    if (res.success) {
      setUser({ id: res.data.userId, username: res.data.username, tier: res.data.tier });
    }
    return res;
  };

  // Seed login (challenge-response)
  const loginWithSeed = async (data) => {
    const res = await authApi.loginWithSeed(data);
    if (res.success) {
      await fetchUser();
    }
    return res;
  };

  // Email + password login
  const loginWithEmail = async ({ email, password, totpCode }) => {
    const res = await authApi.loginWithEmail({ email, password, totpCode });
    if (res.success && !res.data?.requires2FA) {
      await fetchUser();
      await restoreEncryptionState();
    }
    return res;
  };

  // Phone login — verify SMS code
  const loginWithPhone = async ({ phone, code, totpCode }) => {
    const res = await authApi.verifyPhoneCode({ phone, code, totpCode });
    if (res.success && !res.data?.requires2FA) {
      await fetchUser();
      await restoreEncryptionState();
    }
    return res;
  };

  // Legacy alias
  const login = loginWithSeed;

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    setUser(null);
    clearEncryptionState();
    clearWalletFromSession();
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      register, login, loginWithSeed, loginWithEmail, loginWithPhone,
      logout, fetchUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
