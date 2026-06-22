const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://127.0.0.1:8000/api/v1';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
  });

  const page = await context.newPage();

  // ── 1. Landing Page ────────────────────────────────────────────
  console.log('📸 [1/8] Landing Page');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_landing.png') });
  console.log('   ✅ 01_landing.png');

  // ── 2. Auth Page ───────────────────────────────────────────────
  console.log('📸 [2/8] Login Page');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle', timeout: 10000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_auth.png') });
  console.log('   ✅ 02_auth.png');

  // ── Login: get JWT from backend directly, inject into localStorage ──
  console.log('🔑 Authenticating via backend API...');
  const http = require('http');
  const loginResult = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'admin@ars.com', password: 'adminpass' });
    const req = http.request({
      hostname: '127.0.0.1', port: 8000,
      path: '/api/v1/auth/login/json',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const token = loginResult.access_token;
  const user = loginResult.user;
  console.log(`   ✅ Got JWT token for: ${user.email} (${user.role})`);

  // Inject token + user into localStorage so the app thinks we're logged in
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('ars_token', token);
    localStorage.setItem('ars_user', JSON.stringify(user));
    localStorage.setItem('ars_theme', 'dark');
  }, { token, user });
  console.log('   ✅ Auth state injected into localStorage');

  // ── 3. Dashboard Overview ──────────────────────────────────────
  console.log('📸 [3/8] Dashboard Overview');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(5000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_dashboard.png') });
  console.log('   ✅ 03_dashboard.png');

  // ── 4. Resume Intake ───────────────────────────────────────────
  console.log('📸 [4/8] Resume Intake');
  await page.goto(`${BASE_URL}/dashboard/upload`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_upload.png') });
  console.log('   ✅ 04_upload.png');

  // ── 5. Job Management ──────────────────────────────────────────
  console.log('📸 [5/8] Job Management');
  await page.goto(`${BASE_URL}/dashboard/jobs`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_jobs.png') });
  console.log('   ✅ 05_jobs.png');

  // ── 6. Candidates ──────────────────────────────────────────────
  console.log('📸 [6/8] Candidates');
  await page.goto(`${BASE_URL}/dashboard/candidates`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_candidates.png') });
  console.log('   ✅ 06_candidates.png');

  // ── 7. AI Copilot ──────────────────────────────────────────────
  console.log('📸 [7/8] AI Copilot');
  await page.goto(`${BASE_URL}/dashboard/copilot`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_copilot.png') });
  console.log('   ✅ 07_copilot.png');

  // ── 8. Hiring Analytics ────────────────────────────────────────
  console.log('📸 [8/8] Hiring Analytics');
  await page.goto(`${BASE_URL}/dashboard/analytics`, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_analytics.png') });
  console.log('   ✅ 08_analytics.png');

  await browser.close();

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n🎉 Done! ${files.length} screenshots saved to docs/screenshots/`);
  files.forEach(f => console.log(`   ${f}`));
})();
