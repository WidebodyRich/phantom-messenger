import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [unreadCount, setUnreadCount] = useState(0);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(
    (title, options = {}) => {
      if (permission !== 'granted') return;
      if (document.hasFocus()) return; // Don't show if tab is focused

      const notif = new Notification(title, {
        icon: '/ghost-logo.png',
        badge: '/ghost-logo.png',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return notif;
    },
    [permission]
  );

  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'Phantom Messenger';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  return {
    permission,
    requestPermission,
    showNotification,
    unreadCount,
    setUnreadCount,
  };
}
