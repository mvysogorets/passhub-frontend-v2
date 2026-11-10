// Integrity of the passkey item model: encode/decode in the encrypted item, exclude list, safe eligibility.
import test from 'node:test';
import assert from 'node:assert/strict';
import { importFrontend } from './helpers.mjs';

const P = await importFrontend('src/lib/passkey.js');

const passkey = { credentialId: 'AbC-_123', privateKey: '{}', publicKey: '{}', userHandle: 'uh', counter: 3, rpId: 'example.com' };

test('encode -> decode round trip preserves the passkey exactly', () => {
  const cleartext = P.encodePasskeyCleartext(['a', 'b', 'c', 'd', 'e', 'EXTRA', 'EXTRA2'], passkey);
  assert.equal(cleartext.length, 6, 'only 5 display fields + payload');
  assert.deepEqual(cleartext.slice(0, 5), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(P.decodeEncryptedPasskey({ version: 6, cleartext }), passkey);
});

test('encode with fewer than 5 display fields: payload is not at the decode index (documented limitation)', () => {
  const cleartext = P.encodePasskeyCleartext(['a'], passkey);
  assert.equal(cleartext.length, 2);
  assert.equal(P.decodeEncryptedPasskey({ version: 6, cleartext }), null);
});

test('decode rejects wrong version, garbage, and non-passkey payloads', () => {
  const good = P.encodePasskeyCleartext(['1', '2', '3', '4', '5'], passkey);
  assert.equal(P.decodeEncryptedPasskey({ version: 5, cleartext: good }), null);
  assert.equal(P.decodeEncryptedPasskey({ version: 6, cleartext: ['1', '2', '3', '4', '5', 'not json'] }), null);
  assert.equal(P.decodeEncryptedPasskey({ version: 6, cleartext: ['1', '2', '3', '4', '5', '{"type":"note"}'] }), null);
  assert.equal(P.decodeEncryptedPasskey({ version: 6 }), null);
  assert.equal(P.decodeEncryptedPasskey(null), null);
});

test('hydratePasskeyItem marks the item and leaves other items untouched', () => {
  const item = { version: 6, cleartext: P.encodePasskeyCleartext(['1', '2', '3', '4', '5'], passkey) };
  assert.equal(P.hydratePasskeyItem(item), item);
  assert.equal(item.type, 'passkey');
  assert.deepEqual(item.passkey, passkey);
  const pw = { version: 5, cleartext: ['x'] };
  assert.deepEqual(P.hydratePasskeyItem(pw), { version: 5, cleartext: ['x'] });
});

test('normalizeCredentialId: padded/standard base64 equals base64url', () => {
  assert.equal(P.normalizeCredentialId('ab+/cd=='), 'ab-_cd');
  assert.equal(P.normalizeCredentialId('ab-_cd'), 'ab-_cd');
  assert.equal(P.normalizeCredentialId(null), '');
});

test('isDirectWritableSafe: only own (non-group) safes with write role and key', () => {
  const ok = { bstringKey: 'k', user_role: 'editor' };
  assert.equal(P.isDirectWritableSafe(ok), true);
  assert.equal(P.isDirectWritableSafe({ ...ok, user_role: 'administrator' }), true);
  assert.equal(P.isDirectWritableSafe({ ...ok, user_role: 'readonly' }), false);
  assert.equal(P.isDirectWritableSafe({ ...ok, group: 1 }), false);
  assert.equal(P.isDirectWritableSafe({ ...ok, bstringKey: null }), false);
  assert.equal(P.isDirectWritableSafe(null), false);
});

test('hasExcludedPasskey: matches by rpId + credential id only in writable safes', () => {
  const mk = (over = {}) => ({
    bstringKey: 'k', user_role: 'editor',
    rawItems: [{ version: 6, type: 'passkey', passkey: { rpId: 'example.com', credentialId: 'AAA-_' } }],
    ...over,
  });
  const ex = [{ type: 'public-key', id: 'AAA+/==' }]; // different encoding of the same id
  assert.equal(P.hasExcludedPasskey([mk()], 'example.com', ex), true);
  assert.equal(P.hasExcludedPasskey([mk()], 'other.com', ex), false, 'rpId must match');
  assert.equal(P.hasExcludedPasskey([mk({ user_role: 'readonly' })], 'example.com', ex), false);
  assert.equal(P.hasExcludedPasskey([mk()], 'example.com', []), false);
  assert.equal(P.hasExcludedPasskey([mk()], 'example.com', [{ type: 'other', id: 'AAA-_' }]), false);
  assert.throws(() => P.hasExcludedPasskey([mk()], 'example.com', 'nope'), TypeError);
});
