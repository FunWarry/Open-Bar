const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const host = typeof window !== 'undefined' ? window.location.host : 'localhost';

export const environment = {
  production: true,
  environmentName: 'prod',
  apiUrl: '/api',
  wsUrl: `${isHttps ? 'wss' : 'ws'}://${host}/api/ws`,
  appVersion: '1.0.0',
  githubReleasesUrl: 'https://api.github.com/repos/FunWarry/Open-Bar/releases'
};
