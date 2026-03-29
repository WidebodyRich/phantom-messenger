import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function formatRelativeTime(date) {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function formatMessageTime(date) {
  return format(new Date(date), 'h:mm a');
}

export function formatDateSeparator(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMMM d, yyyy');
}

export function formatBTC(sats) {
  const btc = sats / 100000000;
  if (btc === 0) return '0 BTC';
  if (btc < 0.001) return `${sats.toLocaleString()} sats`;
  return `${btc.toFixed(8)} BTC`;
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function truncateAddress(addr, chars = 8) {
  if (!addr) return '';
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
