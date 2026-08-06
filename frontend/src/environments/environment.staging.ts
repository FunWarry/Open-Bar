const isBrowser = typeof window !== 'undefined';
const protocol = isBrowser && window.location.protocol === 'https:' ? 'https:' : 'http:';
const hostname = isBrowser ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  environmentName: 'staging',
  apiUrl: `${protocol}//${hostname}:8080/api`,
  wsUrl: `${protocol === 'https:' ? 'wss' : 'ws'}://${hostname}:8080/api/ws`
};
