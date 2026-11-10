// Static integrity of the Chrome extension package and its contract with the frontend.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { extensionRoot, readExt, readFront, SITE } from './helpers.mjs';

const manifest = JSON.parse(readExt('manifest.json'));
const host = new URL(SITE).hostname;

const globToRegExp = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const matchesAny = (patterns, url) => patterns.some(p => globToRegExp(p).test(url));

test('manifest is MV3 and every referenced file exists', () => {
  assert.equal(manifest.manifest_version, 3);
  const files = new Set([manifest.background.service_worker, manifest.action.default_popup, manifest.options_ui.page,
    ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap(c => c.js),
    ...manifest.web_accessible_resources.flatMap(r => r.resources)]);
  for (const f of files) assert.ok(fs.existsSync(path.join(extensionRoot, f)), `missing ${f}`);
  // files injected programmatically by background.js
  for (const f of ['autofill.js', 'passhubTabScript.js']) {
    assert.ok(readExt('background.js').includes(f), `${f} referenced by background`);
    assert.ok(fs.existsSync(path.join(extensionRoot, f)), `missing ${f}`);
  }
});

test('all extension JS files parse', () => {
  for (const f of ['background.js', 'popup.js', 'autofill.js', 'passkeyBridge.js', 'passkeyInterceptor.js', 'passhubTabScript.js', 'options.js']) {
    assert.doesNotThrow(() => new Function(readExt(f)), f);
  }
});

test(`${host} is allowed to talk to the extension (externally_connectable)`, () => {
  assert.ok(matchesAny(manifest.externally_connectable.matches, SITE + '/frontend/'),
    `${SITE} not covered by externally_connectable.matches`);
});

test('passkey scripts are injected in all pages but never into PassHub itself', () => {
  const passkeyScripts = manifest.content_scripts.filter(c => c.js.some(j => /passkey(Bridge|Interceptor)/.test(j)));
  assert.equal(passkeyScripts.length, 2);
  for (const cs of passkeyScripts) {
    assert.equal(cs.all_frames, true);
    assert.ok(!matchesAny(cs.exclude_matches, 'https://example.com/'), 'ordinary sites are not excluded');
    assert.ok(matchesAny(cs.exclude_matches, SITE + '/'), `${SITE} must be excluded or PassHub would intercept itself`);
    assert.ok(matchesAny(cs.matches, 'https://example.com/login'));
  }
  const bridge = passkeyScripts.find(c => c.js.includes('passkeyBridge.js'));
  const interceptor = passkeyScripts.find(c => c.js.includes('passkeyInterceptor.js'));
  assert.notEqual(bridge.world, 'MAIN', 'bridge needs chrome.runtime => isolated world');
  assert.equal(interceptor.world, 'MAIN', 'interceptor must patch the page navigator.credentials');
  assert.equal(bridge.run_at, 'document_start');
});

test('extension id derived from manifest key is one of the ids the frontend knows', () => {
  const der = Buffer.from(manifest.key, 'base64');
  const id = [...crypto.createHash('sha256').update(der).digest().subarray(0, 16)]
    .map(b => String.fromCharCode(97 + (b >> 4)) + String.fromCharCode(97 + (b & 15))).join('');
  const frontendIds = [...readFront('src/lib/extensionInterface.js')
    .matchAll(/(?:chrome|devChrome|edge|devEdge)ExtensionId\s*=\s*'([a-p]{32})'/g)].map(m => m[1]);
  assert.equal(frontendIds.length, 4);
  assert.ok(frontendIds.includes(id), `manifest key => ${id}; frontend knows ${frontendIds.join(', ')}`);
  assert.ok(crypto.createPublicKey({ key: der, format: 'der', type: 'spki' }), 'key is valid SPKI');
});

test('message ids are consistent between frontend and extension', () => {
  const front = readFront('src/lib/extensionInterface.js') + readFront('src/lib/passhub-passkey-api.js');
  const bg = readExt('background.js');
  const bridge = readExt('passkeyBridge.js');
  const interceptor = readExt('passkeyInterceptor.js');
  const popup = readExt('popup.js');

  // frontend -> background
  for (const id of ['passkey-choose', 'passkey-create-response', 'passkey-get-response', 'clear to send']) {
    assert.ok(front.includes(id), `frontend uses ${id}`);
    assert.ok(bg.includes(id), `background handles ${id}`);
  }
  // frontend receives these from background via the deferred message
  for (const id of ['passkey-create', 'passkey-get']) {
    assert.ok(front.includes(id) && bg.includes(id), id);
  }
  // background -> bridge -> interceptor
  for (const id of ['passkey-chooser-result', 'passkey-create-response', 'passkey-get-response']) {
    assert.ok(bridge.includes(id) && interceptor.includes(id), id);
  }
  assert.ok(bridge.includes('passhub-passkey-chooser') && interceptor.includes('passhub-passkey-chooser'));
  // popup <-> background
  for (const id of ['passkey-select-list', 'passkey-select', 'passkey-chooser']) {
    assert.ok(popup.includes(id) && bg.includes(id), id);
  }
  assert.ok(bg.includes('passkey-chooser-context') && bridge.includes('passkey-chooser-context'));
});

test('passkey requests are only accepted from the PassHub tab via onMessageExternal', () => {
  // content-script/popup channel (onMessage) must not be able to mint passkey responses
  const bg = readExt('background.js');
  const idx = bg.indexOf('chrome.runtime.onMessage.addListener');
  assert.ok(idx > 0);
  assert.ok(!bg.slice(idx).includes("'passkey-create-response'"), 'responses are only handled for external senders');
});

test('frontend passkey bundle needs no node-only APIs and no remote code', () => {
  for (const f of ['src/lib/passkey-generator.js', 'src/lib/passkey.js', 'src/lib/passhub-passkey-api.js']) {
    const s = readFront(f);
    assert.ok(!/\beval\(|new Function\(|require\(/.test(s), `${f}: eval/require`);
    assert.ok(!/https?:\/\/(?!localhost)[a-z0-9.-]+\.[a-z]{2,}/i.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), `${f}: hardcoded remote URL`);
  }
});
