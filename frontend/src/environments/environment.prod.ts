const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const host = typeof window !== 'undefined' ? window.location.host : 'localhost';

export const environment = {
  production: true,
  environmentName: 'prod',
  apiUrl: '/api',
  wsUrl: `${isHttps ? 'wss' : 'ws'}://${host}/api/ws`
};
