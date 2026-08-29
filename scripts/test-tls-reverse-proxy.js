/**
 * OpenBar — Automated Verification Suite for Local HTTPS / TLS Reverse Proxy
 * Tests Nginx reverse proxy configuration, Docker compose port bindings,
 * certificate generator scripts, and documentation synchronization.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const PROD_COMPOSE = path.join(ROOT_DIR, 'docker-compose.prod.yml');
const NGINX_CONF = path.join(ROOT_DIR, 'frontend', 'nginx.conf');
const DOCKERFILE = path.join(ROOT_DIR, 'frontend', 'Dockerfile');
const ENTRYPOINT = path.join(ROOT_DIR, 'frontend', 'entrypoint.sh');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    process.stdout.write(`Testing: ${name}... `);
    fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passedTests++;
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`  -> Error: ${err.message}`);
    failedTests++;
  }
}

console.log('=================================================================');
console.log('   OpenBar HTTPS / TLS Reverse Proxy Verification Test Suite   ');
console.log('=================================================================\n');

// 1. Check docker-compose.prod.yml configuration
runTest('Validate docker-compose.prod.yml frontend ports and certs volume mount', () => {
  if (!fs.existsSync(PROD_COMPOSE)) {
    throw new Error(`docker-compose.prod.yml not found at ${PROD_COMPOSE}`);
  }
  const content = fs.readFileSync(PROD_COMPOSE, 'utf8');
  if (!content.includes('"80:80"') || !content.includes('"443:443"')) {
    throw new Error('frontend service must expose both port 80 and port 443 in docker-compose.prod.yml');
  }
  if (!content.includes('./certs:/etc/nginx/certs:ro')) {
    throw new Error('frontend service must mount ./certs:/etc/nginx/certs:ro in docker-compose.prod.yml');
  }
});

// 2. Check frontend/nginx.conf reverse proxy and TLS configuration
runTest('Validate frontend/nginx.conf HTTP redirect, TLS parameters, and security headers', () => {
  if (!fs.existsSync(NGINX_CONF)) {
    throw new Error(`nginx.conf not found at ${NGINX_CONF}`);
  }
  const conf = fs.readFileSync(NGINX_CONF, 'utf8');

  // HTTP to HTTPS redirect
  if (!conf.includes('listen 80;') || !conf.includes('return 301 https://$host$request_uri;')) {
    throw new Error('nginx.conf must include port 80 HTTP-to-HTTPS permanent 301 redirect');
  }

  // HTTPS listener and TLS params
  if (!conf.includes('listen 443 ssl;') && !conf.includes('listen 443 ssl http2;')) {
    throw new Error('nginx.conf must include port 443 SSL listener');
  }
  if (!conf.includes('/etc/nginx/certs/openbar.crt') || !conf.includes('/etc/nginx/certs/openbar.key')) {
    throw new Error('nginx.conf must reference /etc/nginx/certs/openbar.crt and openbar.key');
  }
  if (!conf.includes('TLSv1.2 TLSv1.3')) {
    throw new Error('nginx.conf must configure TLSv1.2 and TLSv1.3');
  }

  // Camera permissions policy
  if (!conf.includes('Permissions-Policy') || !conf.includes('camera=(self)')) {
    throw new Error('nginx.conf must include Permissions-Policy with camera=(self) for QR scanner');
  }

  // Proxies
  if (!conf.includes('location /api') || !conf.includes('proxy_pass http://backend:8080;')) {
    throw new Error('nginx.conf must proxy /api to backend:8080');
  }
  if (!conf.includes('location /ws') || !conf.includes('Upgrade $http_upgrade')) {
    throw new Error('nginx.conf must proxy /ws with WebSocket upgrade headers');
  }
});

// 3. Check frontend Dockerfile and entrypoint script
runTest('Validate frontend/Dockerfile and entrypoint.sh TLS certificate bootstrap', () => {
  if (!fs.existsSync(DOCKERFILE)) {
    throw new Error(`Dockerfile not found at ${DOCKERFILE}`);
  }
  const dockerfile = fs.readFileSync(DOCKERFILE, 'utf8');
  if (!dockerfile.includes('openssl') || !dockerfile.includes('EXPOSE 80 443') || !dockerfile.includes('entrypoint.sh')) {
    throw new Error('Dockerfile must install openssl, expose 80 and 443, and use entrypoint.sh');
  }

  if (!fs.existsSync(ENTRYPOINT)) {
    throw new Error(`entrypoint.sh not found at ${ENTRYPOINT}`);
  }
  const entrypoint = fs.readFileSync(ENTRYPOINT, 'utf8');
  if (!entrypoint.includes('openbar.crt') || !entrypoint.includes('nginx -g "daemon off;"')) {
    throw new Error('entrypoint.sh must handle fallback certificate creation and start nginx');
  }
});

// 4. Check certificate generation scripts
runTest('Verify generate-local-certs.sh and generate-local-certs.ps1 scripts', () => {
  const shScript = path.join(SCRIPTS_DIR, 'generate-local-certs.sh');
  const psScript = path.join(SCRIPTS_DIR, 'generate-local-certs.ps1');

  if (!fs.existsSync(shScript) || fs.statSync(shScript).size === 0) {
    throw new Error('generate-local-certs.sh is missing or empty');
  }
  if (!fs.existsSync(psScript) || fs.statSync(psScript).size === 0) {
    throw new Error('generate-local-certs.ps1 is missing or empty');
  }

  const shContent = fs.readFileSync(shScript, 'utf8');
  const psContent = fs.readFileSync(psScript, 'utf8');

  if (!shContent.includes('subjectAltName') || !shContent.includes('openbar.lan')) {
    throw new Error('generate-local-certs.sh must configure Subject Alternative Names (SAN)');
  }
  if (!psContent.includes('[CmdletBinding()]') || !psContent.includes('openbar.lan')) {
    throw new Error('generate-local-certs.ps1 must be a valid PowerShell script with SAN');
  }
});

// 5. Check documentation synchronization
runTest('Verify documentation in README, architecture.md, and features-state.md', () => {
  const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
  const arch = fs.readFileSync(path.join(ROOT_DIR, '.agents/knowledge/architecture.md'), 'utf8');
  const features = fs.readFileSync(path.join(ROOT_DIR, '.agents/knowledge/features-state.md'), 'utf8');

  if (!readme.includes('HTTPS') && !readme.includes('TLS')) {
    throw new Error('README.md missing HTTPS / TLS documentation section');
  }
  if (!arch.includes('HTTPS') && !arch.includes('TLS')) {
    throw new Error('architecture.md missing HTTPS / TLS documentation section');
  }
  if (!features.includes('#338')) {
    throw new Error('features-state.md missing feature row for #338');
  }
});

console.log('\n-----------------------------------------------------------------');
console.log(`Results: ${passedTests} passed, ${failedTests} failed.`);
console.log('=================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
