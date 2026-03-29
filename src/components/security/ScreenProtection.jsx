import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import * as messagesApi from '../../api/messages';

export default function ScreenProtection({ children }) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [screenshotDetected, setScreenshotDetected] = useState(false);
  const { activeConversation } = useChat();
  const activeConvRef = useRef(activeConversation);

  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  const handleScreenshotAttempt = () => {
    setScreenshotDetected(true);
    setIsBlurred(true);
    console.warn('[Security] Screenshot attempt detected');

    // Notify the other user
    if (activeConvRef.current?.id) {
      messagesApi.reportScreenshot(activeConvRef.current.id).catch((err) =>
        console.error('[Security] Failed to report screenshot:', err)
      );
    }

    setTimeout(() => {
      setScreenshotDetected(false);
      setIsBlurred(false);
    }, 1500);
  };

  useEffect(() => {
    // 1. BLUR ON FOCUS LOSS — when user switches apps or opens screenshot tool
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setTimeout(() => setIsBlurred(false), 300);
      }
    };

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setTimeout(() => setIsBlurred(false), 200);

    // 2. DETECT PRINT SCREEN + Mac screenshot shortcuts
    const handleKeyDown = (e) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleScreenshotAttempt();
        navigator.clipboard?.writeText('').catch(() => {});
      }
      // Cmd+Shift+3/4/5 (Mac)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleScreenshotAttempt();
      }
      // Ctrl+PrintScreen, Win+PrintScreen
      if ((e.ctrlKey || e.metaKey) && (e.key === 'PrintScreen' || e.keyCode === 44)) {
        e.preventDefault();
        handleScreenshotAttempt();
      }
      // Ctrl+Shift+S (save screenshot in some browsers)
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
      }
      // Ctrl+P (print to PDF workaround)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return (
    <div className="relative">
      {/* Content with protection styles */}
      <div
        className={`transition-all duration-200 ${isBlurred ? 'blur-xl scale-95 opacity-30' : ''}`}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitUserDrag: 'none',
          WebkitTouchCallout: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {/* Blur overlay when screen is not focused */}
      {isBlurred && !screenshotDetected && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-2xl z-50">
          <div className="text-center">
            <Shield className="w-12 h-12 text-phantom-green mx-auto mb-3" />
            <p className="text-phantom-charcoal font-semibold">Content Protected</p>
            <p className="text-phantom-gray-400 text-sm mt-1">Return to view messages</p>
          </div>
        </div>
      )}

      {/* Screenshot detected warning */}
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
