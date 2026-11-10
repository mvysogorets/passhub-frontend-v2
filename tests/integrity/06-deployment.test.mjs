// Integrity of the DEPLOYED PassHub instance (default https://trial.passhub.net) against this checkout and the extension.
// Read-only: no login, no data is created. Override with PASSHUB_SITE=..., skip network with INTEGRITY_OFFLINE=1,
// skip the local build comparison with INTEGRITY_SKIP_BUILD=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SITE, frontendRoot, readExt } from './helpers.mjs';

const offline = !!process.env.INTEGRITY_OFFLINE;
const net = { skip: offline ? 'INTEGRITY_OFFLINE' : false, timeout: 60000 };
const get = (p, init) => fetch(new URL(p, SITE), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init });

let indexHtml, bundlePath, bundle;
async function loadBundle() {
  if (bundle) return bundle;
  indexHtml = await (await get('/frontend/')).text();
  bundlePath = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/)?.[1];
  assert.ok(bundlePath, 'index.html references a module bundle');
  bundle = await (await get(bundlePath)).text();
  return bundle;
}

test('site is served over HTTPS with a valid certificate; http redirects to https', net, async () => {
  const r = await get('/login.php');
  assert.equal(r.status, 200);
  const http = await fetch(SITE.replace('https:', 'http:') + '/', { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.ok([301, 302, 307, 308].includes(http.status), `http status ${http.status}`);
  assert.match(http.headers.get('location') || '', /^https:/);
});

test('unauthenticated users get a login redirect and cannot read or write items', net, async () => {
  const root = await get('/');
  assert.ok([301, 302].includes(root.status));
  assert.match(root.headers.get('location'), /login/);
  for (const body of [{ read: true, vault: '1', entryID: '1' }, { verifier: 'x', vault: '1', folder: 0, encrypted_data: {} }]) {
    const r = await get('/items.php', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { status: 'login' });
  }
});

test('frontend shell and its assets are served with correct content types', net, async () => {
  const bundleSrc = await loadBundle();
  assert.ok(bundleSrc.length > 100_000);
  const js = await get(bundlePath);
  assert.match(js.headers.get('content-type'), /javascript/);
  const css = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1];
  assert.ok(css);
  const c = await get(css);
  assert.equal(c.status, 200);
  assert.match(c.headers.get('content-type'), /css/);
});

test('deployed bundle carries the whole passkey protocol the extension speaks', net, async () => {
  const src = await loadBundle();
  for (const s of ['passkey-create', 'passkey-get', 'passkey-choose', 'passkey-create-response', 'passkey-get-response',
    'webauthn.create', 'webauthn.get', 'expectedRevision', 'clear to send', 'remember me']) {
    assert.ok(src.includes(s), `deployed bundle lacks "${s}"`);
  }
});

test('deployed bundle knows the id of this extension build (manifest key)', net, async () => {
  const src = await loadBundle();
  const manifest = JSON.parse(readExt('manifest.json'));
  const id = [...crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest().subarray(0, 16)]
    .map(b => String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15))).join('');
  assert.ok(src.includes(id), `extension id ${id} not found in deployed bundle: the site cannot talk to this extension`);
});

test('deployed host is inside externally_connectable and excluded from passkey content scripts', net, () => {
  const manifest = JSON.parse(readExt('manifest.json'));
  const host = new URL(SITE).hostname;
  const covered = (pats) => pats.some(p => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(`https://${host}/`));
  assert.ok(covered(manifest.externally_connectable.matches));
  for (const cs of manifest.content_scripts) assert.ok(covered(cs.exclude_matches), 'PassHub must not be intercepted by itself');
});

test('deployed bundle is exactly what this checkout builds (no undeployed / unpushed code)', {
  skip: offline ? 'INTEGRITY_OFFLINE' : process.env.INTEGRITY_SKIP_BUILD ? 'INTEGRITY_SKIP_BUILD' : false, timeout: 180000,
}, async () => {
  const deployed = await loadBundle();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'passhub-integrity-'));
  try {
    const vite = path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    const r = spawnSync(process.execPath, [vite, 'build', '--base=/frontend/', '--outDir', out, '--emptyOutDir'],
      { cwd: frontendRoot, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1', MSYS2_ARG_CONV_EXCL: '*' } });
    assert.equal(r.status, 0, 'vite build failed:\n' + r.stdout + r.stderr);
    const js = fs.readdirSync(path.join(out, 'assets')).find(f => /^index-.*\.js$/.test(f));
    const local = fs.readFileSync(path.join(out, 'assets', js), 'utf8');
    const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
    assert.equal(path.basename(bundlePath), js, `bundle name differs (hash of content): deployed ${path.basename(bundlePath)} vs local ${js}`);
    assert.equal(sha(deployed), sha(local));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('INFO: source maps exposure of the deployed bundle', net, async (t) => {
  const r = await get(bundlePath + '.map');
  t.diagnostic(r.status === 200 ? 'source map is publicly downloadable (build uses sourcemap:true)' : `source map not public (${r.status})`);
});
