// Runtime integrity of passkeyInterceptor.js + passkeyBridge.js running together in a simulated page,
// with a real software authenticator (passkey-generator.js) playing the PassHub side.
import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { importFrontend, runInSandbox, windowOf, b64u, fromB64u, sha256, parseAuthData } from './helpers.mjs';

const { default: PG } = await importFrontend('src/lib/passkey-generator.js');
const safeKey = String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)));
const ORIGIN = 'https://rp.example.com';

function makePage() {
  let win;
  const listeners = [];
  const sent = [];            // chrome.runtime.sendMessage calls from the bridge
  const runtimeListeners = []; // chrome.runtime.onMessage listeners (background -> bridge)
  const calls = { create: [], get: [] };
  const sb = {
    console: { log() { }, info() { }, error() { }, warn() { } },
    location: { href: ORIGIN + '/login', origin: ORIGIN, hostname: 'rp.example.com' },
    crypto, DOMException,
    navigator: { credentials: {
      create: async (o) => { calls.create.push(o); return 'SYSTEM_CREATE'; },
      get: async (o) => { calls.get.push(o); return 'SYSTEM_GET'; },
    } },
    addEventListener: (t, fn) => { if (t === 'message') listeners.push(fn); },
    removeEventListener: (t, fn) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    postMessage(data) { queueMicrotask(() => [...listeners].forEach(fn => fn({ source: win, data }))); },
    chrome: { runtime: {
      sendMessage: async (m) => { sent.push(m); return { status: 'ok' }; },
      onMessage: { addListener: (fn) => runtimeListeners.push(fn) },
    } },
  };
  sb.window = sb;
  runInSandbox('passkeyBridge.js', sb);
  runInSandbox('passkeyInterceptor.js', sb);
  win = windowOf(sb);
  // the way background reaches the page (tabs.sendMessage -> bridge listener)
  const fromBackground = (msg) => runtimeListeners.forEach(fn => fn(msg));
  const nextChooser = async () => {
    for (let i = 0; i < 50 && !sent.length; i++) await new Promise(r => setTimeout(r, 2));
    assert.ok(sent.length, 'bridge forwarded chooser context');
    return sent.shift();
  };
  return { sb, sent, calls, fromBackground, nextChooser, listeners };
}

const rawCreateOptions = () => ({
  publicKey: {
    rp: { id: 'example.com', name: 'Example' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'alice', displayName: 'Alice' },
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    excludeCredentials: [{ type: 'public-key', id: crypto.getRandomValues(new Uint8Array(16)), transports: ['internal'] }],
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    attestation: 'none', timeout: 60000,
  },
  signal: new AbortController().signal,
});

test('calls without publicKey and conditional-mediation get() go straight to the browser', async () => {
  const p = makePage();
  assert.equal(await p.sb.navigator.credentials.create({ password: {} }), 'SYSTEM_CREATE');
  assert.equal(await p.sb.navigator.credentials.get({ password: true }), 'SYSTEM_GET');
  assert.equal(await p.sb.navigator.credentials.get({ mediation: 'conditional', publicKey: { challenge: new Uint8Array(32) } }), 'SYSTEM_GET');
  assert.equal(p.sent.length, 0, 'extension not involved');
});

test('create(): chooser context is JSON-safe, base64url encoded and lossless', async () => {
  const p = makePage();
  const opts = rawCreateOptions();
  const pending = p.sb.navigator.credentials.create(opts);
  const ctx = (await p.nextChooser());
  assert.equal(ctx.id, 'passkey-chooser-context');
  const d = ctx.data;
  assert.equal(d.type, 'passhub-passkey-chooser');
  assert.equal(d.mode, 'create');
  assert.equal(d.url, ORIGIN + '/login');
  assert.ok(d.requestId);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(d)), 'serialisable for chrome.runtime.sendMessage');
  assert.ok(!('signal' in d.options.publicKey), 'AbortSignal is not forwarded');
  const pk = d.options.publicKey;
  assert.equal(d.options.origin, ORIGIN);
  assert.deepEqual(fromB64u(pk.challenge), opts.publicKey.challenge);
  assert.deepEqual(fromB64u(pk.user.id), opts.publicKey.user.id);
  assert.deepEqual(fromB64u(pk.excludeCredentials[0].id), opts.publicKey.excludeCredentials[0].id);
  assert.deepEqual(pk.pubKeyCredParams.map(x => x.alg), [-7, -257]);
  assert.deepEqual(JSON.parse(JSON.stringify(pk.rp)), { id: 'example.com', name: 'Example' });

  p.fromBackground({ id: 'passkey-chooser-result', requestId: d.requestId, choice: 'cancel' });
  await assert.rejects(pending, { name: 'NotAllowedError' });
});

test('create(): "system" falls back to the browser with the ORIGINAL options; "dismissed" rejects', async () => {
  const p = makePage();
  const opts = rawCreateOptions();
  let pending = p.sb.navigator.credentials.create(opts);
  let d = (await p.nextChooser()).data;
  p.fromBackground({ id: 'passkey-chooser-result', requestId: d.requestId, choice: 'system' });
  assert.equal(await pending, 'SYSTEM_CREATE');
  assert.equal(p.calls.create[0], opts, 'untouched options object forwarded');
  assert.ok(opts.publicKey.challenge instanceof Uint8Array);

  pending = p.sb.navigator.credentials.create(rawCreateOptions());
  d = (await p.nextChooser()).data;
  p.fromBackground({ id: 'passkey-chooser-result', requestId: d.requestId, choice: 'dismissed' });
  await assert.rejects(pending, { name: 'NotAllowedError' });
});

test('answers addressed to another requestId are ignored', async () => {
  const p = makePage();
  const pending = p.sb.navigator.credentials.create(rawCreateOptions());
  const d = (await p.nextChooser()).data;
  p.fromBackground({ id: 'passkey-chooser-result', requestId: 'someone-else', choice: 'cancel' });
  p.fromBackground({ id: 'passkey-create-response', requestId: 'someone-else', error: 'x' });
  let settled = false; pending.then(() => settled = true, () => settled = true);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(settled, false);
  p.fromBackground({ id: 'passkey-chooser-result', requestId: d.requestId, choice: 'system' });
  assert.equal(await pending, 'SYSTEM_CREATE');
});

test('create(): full registration through PassHub yields a credential an RP can verify', async () => {
  const p = makePage();
  const opts = rawCreateOptions();
  const pending = p.sb.navigator.credentials.create(opts);
  const d = (await p.nextChooser()).data;

  // PassHub side
  const [, response] = await PG.createPasskey({ url: d.url, options: d.options }, safeKey);
  p.fromBackground({ id: 'passkey-create-response', requestId: d.requestId, response });

  const cred = await pending;
  assert.equal(cred.type, 'public-key');
  assert.equal(cred.id, response.id);
  assert.deepEqual(new Uint8Array(cred.rawId), fromB64u(response.id));
  assert.equal(b64u(cred.rawId), cred.id);
  const cd = JSON.parse(Buffer.from(cred.response.clientDataJSON).toString());
  assert.equal(cd.type, 'webauthn.create');
  assert.equal(cd.challenge, b64u(opts.publicKey.challenge));
  assert.equal(cd.origin, ORIGIN);
  assert.ok(cred.response.attestationObject.byteLength > 37 + 16);
  assert.deepEqual(JSON.parse(JSON.stringify(cred.response.getTransports())), ['internal']);
  assert.deepEqual(JSON.parse(JSON.stringify(cred.getClientExtensionResults())), { credProps: { rk: true } });
  const j = cred.toJSON();
  assert.equal(j.id, cred.id);
  assert.equal(j.rawId, cred.id);
  assert.equal(j.response.clientDataJSON, b64u(cred.response.clientDataJSON));
  assert.equal(j.response.attestationObject, b64u(cred.response.attestationObject));
});

test('create()/get(): PassHub error becomes NotAllowedError', async () => {
  const p = makePage();
  let pending = p.sb.navigator.credentials.create(rawCreateOptions());
  let d = (await p.nextChooser()).data;
  p.fromBackground({ id: 'passkey-create-response', requestId: d.requestId, error: 'No safe or folder selected' });
  await assert.rejects(pending, { name: 'NotAllowedError', message: /No safe or folder selected/ });

  pending = p.sb.navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), rpId: 'example.com' } });
  d = (await p.nextChooser()).data;
  p.fromBackground({ id: 'passkey-get-response', requestId: d.requestId, error: 'No matching passkey' });
  await assert.rejects(pending, { name: 'NotAllowedError', message: /No matching passkey/ });
});

test('get(): full authentication through PassHub yields a verifiable assertion', async () => {
  // register first
  const [item] = await PG.createPasskey({
    url: ORIGIN, options: { origin: ORIGIN, publicKey: {
      rp: { id: 'example.com', name: 'Example' }, user: { id: b64u(crypto.getRandomValues(new Uint8Array(16))), name: 'a', displayName: 'a' },
      challenge: b64u(crypto.getRandomValues(new Uint8Array(32))), pubKeyCredParams: [{ type: 'public-key', alg: -7 }] } },
  }, safeKey);
  const passkey = { ...item.passkey, counter: 1 };

  for (const withAllowList of [true, false]) {
    const p = makePage();
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const publicKey = { challenge, rpId: 'example.com', userVerification: 'required' };
    if (withAllowList) publicKey.allowCredentials = [{ type: 'public-key', id: fromB64u(passkey.credentialId) }];
    const pending = p.sb.navigator.credentials.get({ publicKey });
    const d = (await p.nextChooser()).data;
    assert.equal(d.mode, 'get');
    assert.equal(d.options.publicKey.userVerification, 'required');
    assert.equal(d.options.publicKey.rpId, 'example.com');
    assert.equal(d.options.publicKey.allowCredentials.length, withAllowList ? 1 : 0);

    const assertion = await PG.usePasskey(passkey, PG.base64UrlToArrayBuffer(d.options.publicKey.challenge), safeKey,
      { origin: d.options.origin, rpId: 'example.com' });
    p.fromBackground({ id: 'passkey-get-response', requestId: d.requestId, assertion });
    const cred = await pending;

    assert.equal(cred.id, passkey.credentialId);
    assert.deepEqual(new Uint8Array(cred.rawId), fromB64u(passkey.credentialId));
    const ad = new Uint8Array(cred.response.authenticatorData);
    const cdj = new Uint8Array(cred.response.clientDataJSON);
    assert.equal(parseAuthData(ad).counter, 1);
    const key = nodeCrypto.createPublicKey({ key: JSON.parse(passkey.publicKey), format: 'jwk' });
    assert.ok(nodeCrypto.verify('sha256', Buffer.concat([ad, await sha256(cdj)]),
      { key, dsaEncoding: 'der' }, new Uint8Array(cred.response.signature)), 'RP-side signature verification');
    assert.equal(JSON.parse(Buffer.from(cdj).toString()).challenge, b64u(challenge));
    // userHandle is only returned for discoverable (empty allowCredentials) logins
    if (withAllowList) assert.equal(cred.response.userHandle, null);
    else assert.deepEqual(new Uint8Array(cred.response.userHandle), fromB64u(passkey.userHandle));
    assert.equal(cred.toJSON().response.signature, b64u(cred.response.signature));
  }
});

test('bridge ignores foreign messages and messages from other windows', async () => {
  const p = makePage();
  p.listeners.forEach(fn => fn({ source: {}, data: { type: 'passhub-passkey-chooser', requestId: 'x' } }));
  p.listeners.forEach(fn => fn({ source: windowOf(p.sb), data: { type: 'something-else' } }));
  p.listeners.forEach(fn => fn({ source: windowOf(p.sb), data: null }));
  await new Promise(r => setTimeout(r, 10));
  assert.equal(p.sent.length, 0);
});
