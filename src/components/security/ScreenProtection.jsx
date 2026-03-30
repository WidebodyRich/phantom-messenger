import { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import * as messagesApi from '../../api/messages';
import { API_URL } from '../../utils/constants';
import { getAccessToken } from '../../api/client';

export default function ScreenProtection({ children }) {
  const [isProtected, setIsProtected] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [screenshotDetected, setScreenshotDetected] = useState(false);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { activeConversation } = useChat();
  const { user, logout } = useAuth();
  const activeConvRef = useRef(activeConversation);
  const contentRef = useRef(null);
  const suspiciousRef = useRef(0);

  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  // ═══════════════════════════════════════════
  // NOTIFY: server + chat partner
  // ═══════════════════════════════════════════
  const notifyScreenshotAttempt = useCallback((method) => {
    // Notify chat partner
    if (activeConvRef.current?.id) {
      messagesApi.reportScreenshot(activeConvRef.current.id).catch(() => {});
    }
    // Log to backend
    const token = getAccessToken();
    if (token) {
      fetch(`${API_URL}/api/security/screenshot-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ method, timestamp: new Date().toISOString() }),
      }).catch(() => {});
    }
  }, []);

  const handleScreenshotAttempt = useCallback((method) => {
    setScreenshotDetected(true);
    setIsProtected(true);
    console.warn('[Security] Screenshot attempt:', method);
    notifyScreenshotAttempt(method);
    // Clear clipboard
    navigator.clipboard?.writeText('').catch(() => {});
    setTimeout(() => { setScreenshotDetected(false); setIsProtected(false); }, 2000);
  }, [notifyScreenshotAttempt]);

  // ═══════════════════════════════════════════
  // PROTECTION: Black screen + DOM content kill
  // ═══════════════════════════════════════════
  const activateProtection = useCallback(() => {
    setIsProtected(true);
    // Remove message text from DOM so DevTools/extensions can't read it
    if (contentRef.current) {
      const msgs = contentRef.current.querySelectorAll('[data-message-content]');
      msgs.forEach(el => {
        if (!el.dataset.saved) {
          el.dataset.saved = el.textContent;
          el.textContent = '';
        }
      });
    }
    // Track rapid focus changes
    suspiciousRef.current += 1;
    setSuspiciousCount(suspiciousRef.current);
    if (suspiciousRef.current >= 8) {
      setIsLocked(true);
    }
  }, []);

  const deactivateProtection = useCallback(() => {
    if (isLocked) return;
    setIsProtected(false);
    // Restore message text
    if (contentRef.current) {
      const msgs = contentRef.current.querySelectorAll('[data-message-content]');
      msgs.forEach(el => {
        if (el.dataset.saved) {
          el.textContent = el.dataset.saved;
          delete el.dataset.saved;
        }
      });
    }
  }, [isLocked]);

  // Decay suspicious count over time
  useEffect(() => {
    const t = setInterval(() => {
      suspiciousRef.current = Math.max(0, suspiciousRef.current - 1);
      setSuspiciousCount(suspiciousRef.current);
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // ═══════════════════════════════════════════
  // VISIBILITY & FOCUS — instant black screen
  // ═══════════════════════════════════════════
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) activateProtection();
      else deactivateProtection();
    };
    const onBlur = () => activateProtection();
    const onFocus = () => setTimeout(deactivateProtection, 150);
    const onPageHide = () => activateProtection();

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [activateProtection, deactivateProtection]);

  // ═══════════════════════════════════════════
  // KEYBOARD: block all capture shortcuts
  // ═══════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e) => {
      // PrintScreen
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleScreenshotAttempt('PrintScreen');
        return;
      }
      // Mac: Cmd+Shift+3/4/5
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleScreenshotAttempt('Mac screenshot');
        return;
      }
      // Win+Shift+S (Snipping Tool)
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleScreenshotAttempt('Snipping Tool');
        return;
      }
      // Ctrl+Shift+S (save as)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); return; }
      // Ctrl+S / Cmd+S (save page)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); return; }
      // Ctrl+P / Cmd+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); return; }
      // Ctrl+A / Cmd+A (select all) — block outside inputs
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        const el = document.activeElement;
        if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) {
          e.preventDefault(); return;
        }
      }
      // Ctrl+C / Cmd+C — block copy outside inputs
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !e.shiftKey) {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) {
          const el = document.activeElement;
          if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) {
            e.preventDefault(); return;
          }
        }
      }
      // ── DevTools shortcuts ──
      // F12
      if (e.key === 'F12') { e.preventDefault(); setIsDevToolsOpen(true); return; }
      // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
          (e.metaKey && e.altKey && e.key.toLowerCase() === 'i')) {
        e.preventDefault(); setIsDevToolsOpen(true); return;
      }
      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') ||
          (e.metaKey && e.altKey && e.key.toLowerCase() === 'j')) {
        e.preventDefault(); setIsDevToolsOpen(true); return;
      }
      // Ctrl+Shift+C / Cmd+Opt+C (Element picker)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault(); setIsDevToolsOpen(true); return;
      }
      // Ctrl+U / Cmd+Opt+U (View Source)
      if ((e.ctrlKey && e.key.toLowerCase() === 'u') ||
          (e.metaKey && e.altKey && e.key.toLowerCase() === 'u')) {
        e.preventDefault(); return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleScreenshotAttempt]);

  // ═══════════════════════════════════════════
  // DEVTOOLS DETECTION — window size heuristic
  // ═══════════════════════════════════════════
  useEffect(() => {
    // Only run on production
    const isProd = window.location.hostname === 'phantommessenger.app';

    const checkDevTools = () => {
      const wDiff = window.outerWidth - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > 200 || hDiff > 200) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Image getter trick — fires when DevTools inspects the console
    const img = new Image();
    let devToolsDetected = false;
    Object.defineProperty(img, 'id', {
      get: () => { devToolsDetected = true; setIsDevToolsOpen(true); }
    });

    const interval = setInterval(() => {
      if (isProd) checkDevTools();
      console.log('%c', img);
    }, 3000);

    window.addEventListener('resize', checkDevTools);
    return () => { clearInterval(interval); window.removeEventListener('resize', checkDevTools); };
  }, []);

  // ═══════════════════════════════════════════
  // RIGHT-CLICK + DRAG prevention
  // ═══════════════════════════════════════════
  useEffect(() => {
    const onContext = (e) => {
      const t = e.target;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      e.preventDefault();
    };
    const onDrag = (e) => e.preventDefault();

    document.addEventListener('contextmenu', onContext);
    document.addEventListener('dragstart', onDrag);
    return () => {
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('dragstart', onDrag);
    };
  }, []);

  // ═══════════════════════════════════════════
  // RENDER: Lock / DevTools / Protection screens
  // ═══════════════════════════════════════════

  // Session locked — too many suspicious events
  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-black z-[99999] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Session Locked</h2>
          <p className="text-gray-400 text-sm mb-6">Suspicious activity detected. Please sign in again.</p>
          <button
            onClick={() => {
              logout?.();
              window.location.href = '/login';
            }}
            className="bg-phantom-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-phantom-green-dark transition-colors"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  // DevTools open
  if (isDevToolsOpen) {
    return (
      <div className="fixed inset-0 bg-black z-[99999] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Developer Tools Detected</h2>
          <p className="text-gray-400 text-sm mb-2">Content is hidden while developer tools are open.</p>
          <p className="text-gray-600 text-xs">Close developer tools to continue.</p>
        </div>
      </div>
    );
  }

  // Focus lost / screenshot attempt — instant black screen
  if (isProtected) {
    return (
      <>
        <div className="fixed inset-0 bg-black z-[99999] flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-phantom-green/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-phantom-green" />
            </div>
            <p className="text-white font-semibold text-sm">Content Protected</p>
            <p className="text-gray-600 text-xs mt-1">Return to view messages</p>
          </div>
        </div>
        {/* Screenshot detected banner */}
        {screenshotDetected && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000]">
            <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-bounce">
              <Shield className="w-5 h-5" />
              <span className="font-semibold text-sm">Screenshot detected — other user notified</span>
            </div>
          </div>
        )}
        {/* Keep contentRef mounted but hidden so we can restore content */}
        <div ref={contentRef} className="screen-protected" style={{ display: 'none' }}>
          {children}
        </div>
      </>
    );
  }

  // Normal view
  return (
    <div ref={contentRef} className="screen-protected relative">
      {children}
      {/* Screenshot detected while visible (keyboard shortcut) */}
      {screenshotDetected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-bounce">
            <Shield className="w-5 h-5" />
            <span className="font-semibold text-sm">Screenshot detected — other user notified</span>
          </div>
        </div>
      )}
    </div>
  );
}
