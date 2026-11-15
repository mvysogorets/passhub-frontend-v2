// onPasskeyAdded: the listener API of passhub-passkey-api.js that lets Root re-render the table pane
// after the extension created a passkey. The api module is loaded with stubbed app runtime (see stubs/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { b64u } from './helpers.mjs';

register('./stubs/loader.mjs', import.meta.url);
globalThis.window ??= globalThis;
const { passkeyRequest, onPasskeyAdded } = await import('../../src/lib/passhub-passkey-api.js');

const createMessage = () => ({
  id: 'passkey-create', requestId: 'r1', url: 'https://rp.example.com/register',
  options: { origin: 'https://rp.example.com', publicKey: {
    rp: { id: 'example.com', name: 'Example' },
    user: { id: b64u(crypto.getRandomValues(new Uint8Array(16))), name: 'alice', displayName: 'Alice' },
    challenge: b64u(crypto.getRandomValues(new Uint8Array(32))),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }], excludeCredentials: [] } },
});

const makeSafe = () => ({
  id: 'safe-1', name: 'S', bstringKey: 'k', user_role: 'editor', path: ['S'],
  items: [{ cleartext: ['Zebra'] }, { cleartext: ['apple'] }], rawItems: [],
  rawFolders: [{ _id: 'f1', path: ['S', 'F'], items: [] }],
  folders: [{ id: 'f1', name: 'F', folders: [] }],
});

// extension popup stub: picks the candidate at `index` (0 = the safe root, 1 = its folder)
const setup = (safe, index = 0) => {
  globalThis.__userData = { safes: [safe] };
  globalThis.__axios.posts.length = 0;
  globalThis.__axios.reply = { status: 'Ok', firstID: 'new-1' };
  return async () => ({ index });
};
const create = (ask) => passkeyRequest(createMessage(), ask);

test('onPasskeyAdded: listener gets the safe id when a passkey is saved to the safe root', async () => {
  const safe = makeSafe();
  const ask = setup(safe, 0);
  const calls = [];
  const off = onPasskeyAdded(id => calls.push(id));
  try {
    const reply = await create(ask);
    assert.equal(reply.id, 'passkey-create-response');
    assert.deepEqual(calls, ['safe-1']);
    assert.equal(globalThis.__axios.posts.length, 1);
  } finally { off(); }
});

test('onPasskeyAdded: listener gets the folder id for a passkey saved to a folder', async () => {
  const safe = makeSafe();
  const ask = setup(safe, 1);
  const calls = [];
  const off = onPasskeyAdded(id => calls.push(id));
  try {
    await create(ask);
    assert.deepEqual(calls, ['f1']);
    assert.equal(safe.rawFolders[0].items.length, 1, 'item mirrored into the folder');
    assert.deepEqual(safe.rawFolders[0].items[0].path, ['S', 'F']);
    assert.equal(safe.items.length, 2, 'safe root items untouched');
  } finally { off(); }
});

test('onPasskeyAdded: new root item is mirrored locally (rawItems + sorted items) before listeners run', async () => {
  const safe = makeSafe();
  const ask = setup(safe, 0);
  let seen;
  const off = onPasskeyAdded(() => { seen = { raw: safe.rawItems.length, items: safe.items.map(i => i.cleartext[0]) }; });
  try {
    await create(ask);
    assert.equal(seen.raw, 1);
    assert.deepEqual(seen.items, ['apple', 'Example', 'Zebra'], 'case-insensitive sort by title');
    const added = safe.rawItems[0];
    assert.equal(added._id, 'new-1');
    assert.equal(added.version, 6);
    assert.equal(added.folder, 0);
    assert.deepEqual(added.path, ['S']);
    assert.equal(added.cleartext[0], 'Example');
  } finally { off(); }
});

test('onPasskeyAdded: every registered listener is called; unsubscribe stops further calls', async () => {
  const safe = makeSafe();
  const ask = setup(safe, 0);
  let a = 0, b = 0;
  const offA = onPasskeyAdded(() => a++);
  const offB = onPasskeyAdded(() => b++);
  await create(ask);
  assert.deepEqual([a, b], [1, 1]);
  offA();
  await create(ask);
  assert.deepEqual([a, b], [1, 2]);
  offB();
  await create(ask);
  assert.deepEqual([a, b], [1, 2]);
});

test('onPasskeyAdded: not called when the server refuses to save the passkey', async () => {
  const safe = makeSafe();
  const ask = setup(safe, 0);
  globalThis.__axios.reply = { status: 'Access denied' };
  let called = 0;
  const off = onPasskeyAdded(() => called++);
  try {
    await create(ask);
    assert.equal(called, 0);
    assert.equal(safe.rawItems.length, 0, 'nothing mirrored locally');
  } finally { off(); }
});

test('onPasskeyAdded: not called when the user cancels the location choice', async () => {
  const safe = makeSafe();
  setup(safe, 0);
  let called = 0;
  const off = onPasskeyAdded(() => called++);
  try {
    const reply = await create(async () => ({ cancelled: true }));
    assert.equal(reply.errorName, 'NotAllowedError');
    assert.equal(called, 0);
    assert.equal(globalThis.__axios.posts.length, 0);
  } finally { off(); }
});
