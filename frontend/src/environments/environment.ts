const isBrowser = typeof window !== 'undefined';
const protocol = isBrowser && window.location.protocol === 'https:' ? 'https:' : 'http:';
const host = isBrowser ? window.location.host : 'localhost:4200';

export const environment = {
  production: false,
  environmentName: 'dev',
  apiUrl: '/api',
  wsUrl: `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/api/ws`
};