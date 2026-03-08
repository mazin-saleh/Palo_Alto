export const API_BASE = 'http://localhost:8000/api';

export const SEVERITY_COLORS = {
  critical: 'bg-coral text-white',
  high: 'bg-terracotta text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-sky-500 text-white',
  noise: 'bg-pebble text-white',
};

export const SEVERITY_DOT = {
  critical: 'bg-coral',
  high: 'bg-terracotta',
  medium: 'bg-amber-500',
  low: 'bg-sky-500',
  noise: 'bg-pebble',
};

export const SEVERITY_BORDER = {
  critical: 'border-coral',
  high: 'border-terracotta',
  medium: 'border-amber-400',
  low: 'border-sky-400',
  noise: 'border-sand',
};

export const SEVERITY_TEXT = {
  critical: 'text-coral',
  high: 'text-terracotta',
  medium: 'text-amber-600',
  low: 'text-sky-600',
  noise: 'text-pebble',
};

export const SEVERITY_BG_LIGHT = {
  critical: 'bg-coral-light',
  high: 'bg-terracotta-light',
  medium: 'bg-amber-50',
  low: 'bg-sky-50',
  noise: 'bg-sand-light',
};

export const CATEGORY_LABELS = {
  Phishing: 'Phishing',
  Malware: 'Malware',
  'Physical Hazard': 'Physical Hazard',
  'Network Breach': 'Network Breach',
  'Natural Disaster': 'Natural Disaster',
  Scam: 'Scam',
  'Suspicious Activity': 'Suspicious Activity',
  'Infrastructure Failure': 'Infrastructure',
  Noise: 'Noise',
};

export const CATEGORY_ICONS = {
  Phishing: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  Malware: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  'Physical Hazard': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  'Network Breach': 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0',
  'Natural Disaster': 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  Scam: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'Suspicious Activity': 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  'Infrastructure Failure': 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  Noise: 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2',
};

export const CATEGORIES = [
  'Phishing', 'Malware', 'Physical Hazard', 'Network Breach',
  'Natural Disaster', 'Scam', 'Suspicious Activity',
  'Infrastructure Failure', 'Noise',
];

export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'noise'];

export const ZONES = [
  'Sector 1', 'Sector 2', 'Sector 3', 'Sector 4',
  'Sector 5', 'Sector 6', 'Sector 7', 'Sector 8', 'Sector 9',
];

export const ZONE_LABELS = {
  'Sector 1': 'Downtown',
  'Sector 2': 'Midtown',
  'Sector 3': 'South Palo Alto',
  'Sector 4': 'University / Stanford',
  'Sector 5': 'Barron Park',
  'Sector 6': 'Ventura',
  'Sector 7': 'Greenmeadow',
  'Sector 8': 'Charleston Meadows',
  'Sector 9': 'Foothills',
};

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
