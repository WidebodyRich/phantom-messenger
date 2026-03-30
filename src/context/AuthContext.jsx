import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
      const refreshToken = localStorage.getItem('phantom_refresh');
      if (refreshToken) {
        try {
          await authApi.refreshAccessToken();
          await fetchUser();
          // Restore Signal Protocol state
          await restoreEncryptionState();
        } catch {
          localStorage.removeItem('phantom_refresh');
        }
      }
      setLoading(false);
    };
    init();
  }, [fetchUser]);

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
  const loginWithEmail = async ({ email, password }) => {
    const res = await authApi.loginWithEmail({ email, password });
    if (res.success) {
      await fetchUser();
      await restoreEncryptionState();
    }
    return res;
  };

  // Phone login — verify SMS code
  const loginWithPhone = async ({ phone, code }) => {
    const res = await authApi.verifyPhoneCode({ phone, code });
    if (res.success) {
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
