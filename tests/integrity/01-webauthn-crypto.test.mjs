// Integrity of the software authenticator: what PassHub creates must be accepted by a relying party.
import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { importFrontend, b64u, fromB64u, sha256, cborDecode, parseAuthData, coseToJwk } from './helpers.mjs';

const { default: PG } = await importFrontend('src/lib/passkey-generator.js');

const challenge = crypto.getRandomValues(new Uint8Array(32));
const userId = crypto.getRandomValues(new Uint8Array(16));
const ORIGIN = 'https://rp.example.com';

const createMessage = (over = {}) => ({
  url: ORIGIN + '/register',
  options: {
    origin: ORIGIN,
    publicKey: {
      rp: { id: 'example.com', name: 'Example' },
      user: { id: b64u(userId), name: 'alice', displayName: 'Alice' },
      challenge: b64u(challenge),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      excludeCredentials: [],
      ...over,
    },
  },
});

const getOpts = { origin: ORIGIN, rpId: 'example.com' };

test('createPasskey: registration response is a valid "none" attestation', async () => {
  const [item, resp] = await PG.createPasskey(createMessage());

  assert.equal(resp.type, 'public-key');
  assert.equal(resp.id, resp.rawId);
  assert.match(resp.id, /^[A-Za-z0-9_-]+$/, 'id must be unpadded base64url');
  assert.equal(fromB64u(resp.id).length, 16);

  const cd = JSON.parse(Buffer.from(fromB64u(resp.response.clientDataJSON)).toString());
  assert.equal(cd.type, 'webauthn.create');
  assert.equal(cd.challenge, b64u(challenge));
  assert.equal(cd.origin, ORIGIN);

  const attBytes = fromB64u(resp.response.attestationObject);
  const { value: att, consumed } = cborDecode(attBytes);
  assert.equal(consumed, attBytes.length, 'no trailing bytes');
  assert.equal(att.get('fmt'), 'none');
  assert.equal(att.get('attStmt').size, 0);
  const ad = parseAuthData(att.get('authData'));
  assert.deepEqual(ad.rpIdHash, await sha256(new TextEncoder().encode('example.com')));
  assert.equal(ad.flags & 0x41, 0x41, 'UP + AT set');
  assert.equal(ad.counter, 0);
  assert.equal(ad.trailing, 0, 'authData has no trailing bytes');
  assert.equal(b64u(ad.credentialId), resp.id);

  // COSE key: EC2 / ES256 / P-256 and equal to the stored public key
  assert.equal(ad.cose.get(1), 2);
  assert.equal(ad.cose.get(3), -7);
  assert.equal(ad.cose.get(-1), 1);
  assert.equal(ad.cose.get(-2).length, 32);
  assert.equal(ad.cose.get(-3).length, 32);
  const stored = JSON.parse(item.passkey.publicKey);
  assert.equal(stored.x, b64u(ad.cose.get(-2)));
  assert.equal(stored.y, b64u(ad.cose.get(-3)));
  assert.doesNotThrow(() => nodeCrypto.createPublicKey({ key: coseToJwk(ad.cose), format: 'jwk' }), 'point is on the curve');
});

test('createPasskey: stored record has the expected shape and does not leak the private key', async () => {
  const [item] = await PG.createPasskey(createMessage());
  assert.deepEqual(Object.keys(item.passkey).sort(),
    ['counter', 'credentialId', 'privateKey', 'publicKey', 'rpId', 'userHandle']);
  assert.equal(item.passkey.counter, 0);
  assert.equal(item.passkey.rpId, 'example.com');
  assert.equal(item.passkey.userHandle, b64u(userId));
  assert.equal(JSON.parse(item.passkey.publicKey).d, undefined, 'public JWK has no d');
  assert.equal(typeof item.passkey.privateKey, 'string');
  assert.ok(!/[+/=]/.test(item.passkey.privateKey), 'private key is unpadded base64url');
  const der = fromB64u(item.passkey.privateKey);
  const priv = nodeCrypto.createPrivateKey({ key: Buffer.from(der), format: 'der', type: 'pkcs8' });
  assert.equal(priv.asymmetricKeyType, 'ec');
  assert.equal(priv.asymmetricKeyDetails.namedCurve, 'prime256v1');
  assert.equal(nodeCrypto.createPublicKey(priv).export({ format: 'jwk' }).x, JSON.parse(item.passkey.publicKey).x,
    'private key matches the stored public key');
  assert.equal(item.rpName, 'Example');
  assert.ok(item.url.startsWith(ORIGIN));
});

test('createPasskey: every call yields a unique credential id and key', async () => {
  const ids = new Set(), keys = new Set();
  for (let i = 0; i < 5; i++) {
    const [item] = await PG.createPasskey(createMessage());
    ids.add(item.passkey.credentialId); keys.add(item.passkey.publicKey);
  }
  assert.equal(ids.size, 5);
  assert.equal(keys.size, 5);
});

test('createPasskey: rejects a request without user handle', async () => {
  const m = createMessage(); delete m.options.publicKey.user.id;
  await assert.rejects(PG.createPasskey(m), /user handle/i);
});

test('createPasskey: tolerates rp without name (falls back to id)', async () => {
  // Source has `publicKey.rp?.name || rp.Id` (typo) which throws ReferenceError when rp.name is absent.
  await assert.doesNotReject(PG.createPasskey(createMessage({ rp: { id: 'example.com' } })));
});

test('createPasskey: rp without id resolves to the page host', async () => {
  const [item] = await PG.createPasskey(createMessage({ rp: { name: 'Example' } }));
  const host = item.passkey.rpId.includes('://') ? new URL(item.passkey.rpId).hostname : item.passkey.rpId;
  assert.equal(host, 'rp.example.com');
});

async function makeAssertion({ counter = 7 } = {}) {
  const [item] = await PG.createPasskey(createMessage());
  const passkey = { ...item.passkey, counter };
  const ch = crypto.getRandomValues(new Uint8Array(32));
  const a = await PG.usePasskey(passkey, ch, getOpts);
  return { item, passkey, ch, a };
}

test('usePasskey: assertion verifies with the registered public key (DER ES256)', async () => {
  const { passkey, ch, a } = await makeAssertion({ counter: 7 });
  const ad = fromB64u(a.authenticatorData);
  const cdj = fromB64u(a.clientDataJSON);
  const parsed = parseAuthData(ad);
  assert.deepEqual(parsed.rpIdHash, await sha256(new TextEncoder().encode('example.com')));
  assert.equal(parsed.flags, 0x05);
  assert.equal(parsed.counter, 7);
  assert.equal(ad.length, 37);

  const cd = JSON.parse(Buffer.from(cdj).toString());
  assert.deepEqual([cd.type, cd.challenge, cd.origin, cd.crossOrigin], ['webauthn.get', b64u(ch), ORIGIN, false]);

  const data = Buffer.concat([ad, await sha256(cdj)]);
  const key = nodeCrypto.createPublicKey({ key: JSON.parse(passkey.publicKey), format: 'jwk' });
  const sig = fromB64u(a.signature);
  assert.equal(sig[0], 0x30, 'DER sequence');
  assert.ok(nodeCrypto.verify('sha256', data, { key, dsaEncoding: 'der' }, sig), 'signature valid');

  // negative controls
  const bad = Buffer.from(data); bad[40] ^= 1;
  assert.ok(!nodeCrypto.verify('sha256', bad, { key, dsaEncoding: 'der' }, sig), 'tampered data rejected');
  const other = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey;
  assert.ok(!nodeCrypto.verify('sha256', data, { key: other, dsaEncoding: 'der' }, sig), 'other key rejected');

  assert.equal(a.credentialId, passkey.credentialId);
  assert.equal(a.userHandle, b64u(userId));
});

test('usePasskey: DER signatures are always well formed (60 signatures)', async () => {
  const [item] = await PG.createPasskey(createMessage());
  const key = nodeCrypto.createPublicKey({ key: JSON.parse(item.passkey.publicKey), format: 'jwk' });
  for (let i = 0; i < 60; i++) {
    const a = await PG.usePasskey({ ...item.passkey, counter: i }, crypto.getRandomValues(new Uint8Array(32)), getOpts);
    const data = Buffer.concat([fromB64u(a.authenticatorData), await sha256(fromB64u(a.clientDataJSON))]);
    const sig = fromB64u(a.signature);
    assert.equal(sig[1], sig.length - 2, 'DER length byte consistent');
    assert.ok(nodeCrypto.verify('sha256', data, { key, dsaEncoding: 'der' }, sig), `iteration ${i}`);
  }
});

test('usePasskey: sign counter is encoded big-endian over the full uint32 range', async () => {
  for (const c of [0, 1, 255, 256, 65536, 0xFFFFFFFE]) {
    const { a } = await makeAssertion({ counter: c });
    assert.equal(parseAuthData(fromB64u(a.authenticatorData)).counter, c);
  }
});

test('usePasskey: rpId stored as a full URL is reduced to the host for hashing', async () => {
  const [item] = await PG.createPasskey(createMessage({ rp: { name: 'x' } }));
  const a = await PG.usePasskey({ ...item.passkey, counter: 1 }, challenge, { origin: ORIGIN });
  assert.deepEqual(parseAuthData(fromB64u(a.authenticatorData)).rpIdHash,
    await sha256(new TextEncoder().encode('rp.example.com')));
});

test('serialized private key: tampered or malformed values are rejected', async () => {
  const [item] = await PG.createPasskey(createMessage());
  const use = (privateKey) => PG.usePasskey({ ...item.passkey, privateKey, counter: 1 }, challenge, getOpts);

  await assert.rejects(use(''));
  await assert.rejects(use('not-a-key'));
  const der = fromB64u(item.passkey.privateKey).slice(0, 20); // truncated DER
  await assert.rejects(use(b64u(der)));
});

test('serialized private key: no wrapping envelope, unique per passkey', async () => {
  const [a] = await PG.createPasskey(createMessage());
  const [b] = await PG.createPasskey(createMessage());
  assert.ok(!a.passkey.privateKey.startsWith('{'), 'not a JSON envelope');
  assert.notEqual(a.passkey.privateKey, b.passkey.privateKey);
});

test('base64url helpers: strict unpadded round trip', () => {
  for (const n of [0, 1, 2, 3, 15, 16, 31, 32, 33]) {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    const s = bytes.toBase64({ alphabet: 'base64url' });
    assert.ok(!/[+/=]/.test(s));
    assert.deepEqual(new Uint8Array(PG.base64UrlToArrayBuffer(s)), bytes);
  }
});
