export const config = {
  appName: 'LyuBid Admin',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
} as const;
