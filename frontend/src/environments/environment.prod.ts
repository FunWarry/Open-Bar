export const environment = {
  production: true,
  environmentName: 'prod',
  apiUrl: '/api',
  wsUrl: 'ws://' + (typeof window !== 'undefined' ? window.location.host : 'localhost') + '/api/ws'
};
