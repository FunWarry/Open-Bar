import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { setupMockApi } from '../helpers/mock-api.helper';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const DIST_BROWSER_DIR = path.join(FRONTEND_ROOT, 'dist/gestion-cocktail-frontend/browser');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function resolveStaticFilePath(rootDir: string, reqUrl: string): string {
  const cleanUrl = reqUrl.split('?')[0];
  const relativePath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  const candidate = path.resolve(rootDir, relativePath);

  if (candidate.startsWith(rootDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  return path.join(rootDir, 'index.html');
}

function startStaticProductionServer(rootDir: string): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const filePath = resolveStaticFilePath(rootDir, req.url || '/');
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      if (filePath.endsWith('ngsw-worker.js') || filePath.endsWith('ngsw.json') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }

      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', reject);
    server.listen(0, 'localhost', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind ephemeral localhost server port'));
        return;
      }
      resolve({ server, baseUrl: `http://localhost:${address.port}` });
    });
  });
}

function ensureProductionBuild(): void {
  const swPath = path.join(DIST_BROWSER_DIR, 'ngsw-worker.js');
  const manifestPath = path.join(DIST_BROWSER_DIR, 'manifest.webmanifest');
  const ngswConfigPath = path.join(DIST_BROWSER_DIR, 'ngsw.json');

  if (fs.existsSync(swPath) && fs.existsSync(manifestPath) && fs.existsSync(ngswConfigPath)) {
    return;
  }

  execSync('npx ng build --configuration production', {
    cwd: FRONTEND_ROOT,
    stdio: 'pipe',
  });
}

test.describe('PWA Manifest, Icons, Service Worker & Installability', () => {
  test.describe.configure({ mode: 'serial' });

  let prodServer: http.Server | null = null;
  let prodBaseUrl = '';

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180_000);
    ensureProductionBuild();
    const started = await startStaticProductionServer(DIST_BROWSER_DIR);
    prodServer = started.server;
    prodBaseUrl = started.baseUrl;
  });

  test.afterAll(async () => {
    if (prodServer) {
      await new Promise<void>((resolve) => {
        prodServer?.close(() => resolve());
      });
      prodServer = null;
    }
  });

  test('should expose valid webmanifest link, theme-color, and accessible 192x192 / 512x512 icons on app shell', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/auth/login');

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('manifest.webmanifest');

    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#0f0f1a');

    const manifestResponse = await page.request.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);

    const manifest = (await manifestResponse.json()) as {
      display: string;
      start_url: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#0f0f1a');
    expect(manifest.background_color).toBe('#0f0f1a');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const expectedSizes = ['192x192', '512x512'];
    for (const size of expectedSizes) {
      const iconEntry = manifest.icons.find((icon) => icon.sizes === size);
      expect(iconEntry).toBeTruthy();
      expect(iconEntry?.type).toBe('image/png');
      expect(iconEntry?.purpose).toBe('any maskable');

      const iconUrl = iconEntry?.src.startsWith('/') ? iconEntry.src : `/${iconEntry?.src}`;
      const iconResponse = await page.request.get(iconUrl);
      expect(iconResponse.status()).toBe(200);

      const buffer = await iconResponse.body();
      expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      const [expectedWidth, expectedHeight] = size.split('x').map(Number);
      expect(buffer.readUInt32BE(16)).toBe(expectedWidth);
      expect(buffer.readUInt32BE(20)).toBe(expectedHeight);
    }
  });

  test('should emit ngsw-worker.js and ngsw.json with app-shell caching only and register active Service Worker in production build', async ({ page }) => {
    await setupMockApi(page);

    const swScriptRes = await page.request.get(`${prodBaseUrl}/ngsw-worker.js`);
    expect(swScriptRes.status()).toBe(200);

    const ngswConfigRes = await page.request.get(`${prodBaseUrl}/ngsw.json`);
    expect(ngswConfigRes.status()).toBe(200);
    const ngswConfig = (await ngswConfigRes.json()) as {
      index: string;
      assetGroups: Array<{ name: string }>;
      dataGroups?: unknown[];
    };
    expect(ngswConfig.index).toBe('/index.html');
    expect(ngswConfig.assetGroups.map((g) => g.name)).toEqual(['app', 'assets']);
    expect(ngswConfig.dataGroups ?? []).toEqual([]);

    await page.goto(`${prodBaseUrl}/auth/login`, { waitUntil: 'networkidle' });

    const swRegistration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false, active: false, scriptURL: '', state: '' };
      }
      const registration = await navigator.serviceWorker.ready;
      return {
        supported: true,
        active: Boolean(registration.active),
        scriptURL: registration.active?.scriptURL || '',
        state: registration.active?.state || '',
      };
    });

    expect(swRegistration.supported).toBe(true);
    expect(swRegistration.active).toBe(true);
    expect(swRegistration.state).toBe('activated');
    expect(swRegistration.scriptURL).toMatch(/\/ngsw-worker\.js$/);

    // Verify controller takes control after reload
    await page.reload({ waitUntil: 'networkidle' });
    const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    expect(hasController).toBe(true);

    // Verify Chromium PWA manifest parsing and installability engine report zero errors
    const cdp = await page.context().newCDPSession(page);
    const appManifest = await cdp.send('Page.getAppManifest');
    expect(appManifest.errors).toEqual([]);
    expect(appManifest.url).toBe(`${prodBaseUrl}/manifest.webmanifest`);

    const installability = await cdp.send('Page.getInstallabilityErrors');
    expect(installability.installabilityErrors).toEqual([]);
  });
});
