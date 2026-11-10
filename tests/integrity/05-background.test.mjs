// Runtime integrity of background.js (service worker) with a mock chrome.* API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runInSandbox } from './helpers.mjs';

const tick = (ms = 5) => new Promise(r => setTimeout(r, ms));

function makeWorker({ passhubConnected = false } = {}) {
  const l = { external: [], message: [], connect: [] };
  const session = {};
  if (passhubConnected) session.passhub = { peer: { tab: { id: 77 } }, version: 2 };
  const tabMessages = []; // chrome.tabs.sendMessage calls
  const runtimeMessages = []; // chrome.runtime.sendMessage calls (to popup)
  let popupOpened = 0;
  const chrome = {
    runtime: {
      onMessageExternal: { addListener: fn => l.external.push(fn) },
      onMessage: { addListener: fn => l.message.push(fn) },
      onConnect: { addListener: fn => l.connect.push(fn) },
      onInstalled: { addListener() { } },
      getManifest: () => ({ externally_connectable: { matches: [] } }),
      sendMessage: async (m) => { runtimeMessages.push(m); return undefined; },
    },
    storage: { session: {
      set: async (o) => Object.assign(session, o),
      get: async (k) => (typeof k === 'string' ? { [k]: session[k] } : Object.fromEntries(k.map(x => [x, session[x]]))),
      remove: async (k) => { delete session[k]; },
    } },
    tabs: {
      query() { }, create: async () => ({ id: 1 }),
      sendMessage: async (tabId, msg, opts) => {
        tabMessages.push({ tabId, msg, opts });
        if (tabId === 77) return { farewell: 'passhubTabScript goodbye' };
        return undefined;
      },
    },
    action: { openPopup: async () => { popupOpened++; } },
    scripting: { executeScript: async () => [] },
  };
  const sb = { chrome, console: { log() { }, error() { }, warn() { } }, setTimeout, clearTimeout, Event: class { } };
  runInSandbox('background.js', sb);
  const external = (req, sender = { url: 'https://trial.passhub.net/', origin: 'https://trial.passhub.net', tab: { id: 77 } }) =>
    new Promise(resolve => {
      let responded = false;
      const sendResponse = (r) => { responded = true; resolve(r); };
      let async = false;
      for (const fn of l.external) async = fn(req, sender, sendResponse) === true || async;
      if (!async && !responded) resolve(undefined);
    });
  const internal = (msg, sender) => new Promise(resolve => {
    let responded = false;
    const sendResponse = (r) => { responded = true; resolve(r); };
    let async = false;
    for (const fn of l.message) async = fn(msg, sender, sendResponse) === true || async;
    if (!async && !responded) resolve(undefined);
  });
  const port = (name) => {
    const p = { name, posted: [], onMessage: { l: [], addListener(f) { this.l.push(f); } }, onDisconnect: { l: [], addListener(f) { this.l.push(f); } },
      postMessage(m) { p.posted.push(m); },
      say(m) { p.onMessage.l.forEach(f => f(m)); }, close() { p.onDisconnect.l.forEach(f => f()); } };
    l.connect.forEach(fn => fn(p));
    return p;
  };
  return { chrome, session, tabMessages, runtimeMessages, external, internal, port, popupOpened: () => popupOpened };
}

const pageContext = (requestId, mode = 'create') => ({
  type: 'passhub-passkey-chooser', requestId, mode, url: 'https://rp.example.com/',
  options: { origin: 'https://rp.example.com', publicKey: { challenge: 'abc' } },
});

test('page -> popup: bridge context is stored, popup opened in the sender window, tab remembered', async () => {
  const w = makeWorker();
  const r = await w.internal({ id: 'passkey-chooser-context', data: pageContext('r1') }, { tab: { id: 5, windowId: 9 }, frameId: 3 });
  assert.deepEqual({ ...r }, { status: 'ok' });
  assert.equal(w.session.passkeyChooserContext.requestId, 'r1');
  assert.equal(w.popupOpened(), 1);
});

test('chooser "system": popup disconnect relays the choice to the exact tab+frame that asked', async () => {
  const w = makeWorker();
  await w.internal({ id: 'passkey-chooser-context', data: pageContext('r1') }, { tab: { id: 5, windowId: 9 }, frameId: 3 });
  const port = w.port('passkey-chooser');
  port.say({ requestId: 'r1', context: pageContext('r1') });
  port.say({ requestId: 'r1', choice: 'system' });
  port.close();
  await tick();
  assert.equal(w.tabMessages.length, 1);
  const { tabId, msg, opts } = w.tabMessages[0];
  assert.equal(tabId, 5);
  assert.equal(opts.frameId, 3);
  assert.deepEqual({ ...msg }, { id: 'passkey-chooser-result', requestId: 'r1', choice: 'system' });
});

test('chooser closed without a choice is reported as "dismissed" (exactly once)', async () => {
  const w = makeWorker();
  await w.internal({ id: 'passkey-chooser-context', data: pageContext('r2') }, { tab: { id: 5, windowId: 9 }, frameId: 0 });
  const port = w.port('passkey-chooser');
  port.say({ requestId: 'r2', context: pageContext('r2') });
  port.close();
  port.close();
  await tick();
  assert.equal(w.tabMessages.length, 1);
  assert.equal(w.tabMessages[0].msg.choice, 'dismissed');
});

test('"passhub" choice with no PassHub session: popup told "not connected", page gets "cancel"', async () => {
  const w = makeWorker({ passhubConnected: false });
  await w.internal({ id: 'passkey-chooser-context', data: pageContext('r3') }, { tab: { id: 5, windowId: 9 }, frameId: 0 });
  const port = w.port('passkey-chooser');
  port.say({ requestId: 'r3', context: pageContext('r3') });
  port.say({ requestId: 'r3', choice: 'passhub' });
  await tick();
  assert.deepEqual([...port.posted], ['not connected']);
  port.close();
  await tick();
  assert.equal(w.tabMessages.at(-1).msg.choice, 'cancel');
});

test('"passhub" choice with a live PassHub tab: request is deferred and handed out ONCE as passkey-create', async () => {
  const w = makeWorker({ passhubConnected: true });
  await w.internal({ id: 'passkey-chooser-context', data: pageContext('r4', 'create') }, { tab: { id: 5, windowId: 9 }, frameId: 0 });
  const port = w.port('passkey-chooser');
  port.say({ requestId: 'r4', context: pageContext('r4', 'create') });
  port.say({ requestId: 'r4', choice: 'passhub' });
  await tick(20);
  // PassHub tab was poked
  assert.ok(w.tabMessages.some(m => m.tabId === 77 && m.msg.id === 'request to send'));
  // popup closing after a passhub choice must NOT cancel the page
  port.close();
  await tick();
  assert.ok(!w.tabMessages.some(m => m.tabId === 5), 'page not answered on popup close');

  const first = await w.external({ id: 'clear to send' });
  assert.equal(first.id, 'passkey-create');
  assert.equal(first.requestId, 'r4');
  assert.ok(!('mode' in first) && !('type' in first), 'transport fields stripped');
  assert.equal(first.options.publicKey.challenge, 'abc');
  const second = await w.external({ id: 'clear to send' });
  assert.equal(second, null, 'no replay of an old request');

  // get mode maps to passkey-get
  const w2 = makeWorker({ passhubConnected: true });
  await w2.internal({ id: 'passkey-chooser-context', data: pageContext('r5', 'get') }, { tab: { id: 5, windowId: 9 }, frameId: 0 });
  const p2 = w2.port('passkey-chooser');
  p2.say({ requestId: 'r5', context: pageContext('r5', 'get'), choice: 'passhub' });
  await tick(20);
  assert.equal((await w2.external({ id: 'clear to send' })).id, 'passkey-get');
});

test('PassHub -> page: create/get responses are routed to the originating tab only', async () => {
  const w = makeWorker();
  await w.internal({ id: 'passkey-chooser-context', data: pageContext('rA') }, { tab: { id: 11, windowId: 1 }, frameId: 2 });
  await w.internal({ id: 'passkey-chooser-context', data: pageContext('rB', 'get') }, { tab: { id: 22, windowId: 1 }, frameId: 0 });

  const ack = await w.external({ id: 'passkey-get-response', requestId: 'rB', assertion: { x: 1 } });
  assert.match(ack.farewell, /goodbye passkey-get-response/);
  await w.external({ id: 'passkey-create-response', requestId: 'rA', response: { y: 2 } });
  await tick();

  const toB = w.tabMessages.find(m => m.tabId === 22), toA = w.tabMessages.find(m => m.tabId === 11);
  assert.equal(toB.msg.assertion.x, 1);
  assert.equal(toA.msg.response.y, 2);
  assert.equal(toA.opts.frameId, 2);

  // a repeat / unknown requestId is dropped
  const before = w.tabMessages.length;
  await w.external({ id: 'passkey-create-response', requestId: 'rA', response: {} });
  await w.external({ id: 'passkey-create-response', requestId: 'nope', response: {} });
  await tick();
  assert.equal(w.tabMessages.length, before);
});

test('passkey-choose (several matches): popup choice is returned as the reply; closing = cancelled; newer request supersedes', async () => {
  const w = makeWorker();
  const cands = [{ index: 0, origin: 'a' }, { index: 1, origin: 'b' }];

  let reply = w.external({ id: 'passkey-choose', rpId: 'example.com', candidates: cands });
  await tick();
  assert.equal(w.session.passkeySelectContext?.candidates.length ?? 2, 2);
  let p = w.port('passkey-select');
  p.say({ index: 1 });
  assert.equal((await reply).index, 1);

  reply = w.external({ id: 'passkey-choose', candidates: cands });
  await tick();
  p = w.port('passkey-select');
  p.close();
  assert.equal((await reply).cancelled, true);

  const first = w.external({ id: 'passkey-choose', candidates: cands });
  await tick();
  const second = w.external({ id: 'passkey-choose', candidates: cands });
  assert.equal((await first).cancelled, true, 'old request cancelled');
  p = w.port('passkey-select');
  p.say({ index: 0 });
  assert.equal((await second).index, 0);
});

test('passkey-choose ignores non-integer indices from the popup (no injection of odd values)', async () => {
  const w = makeWorker();
  const reply = w.external({ id: 'passkey-choose', candidates: [{ index: 0 }] });
  await tick();
  const p = w.port('passkey-select');
  p.say({ index: '0; drop' });
  p.say({ index: 1.5 });
  p.say({ index: 0 });
  assert.equal((await reply).index, 0);
});

test('"remember me" stores the PassHub tab; unknown external ids get a harmless farewell', async () => {
  const w = makeWorker();
  const r = await w.external({ id: 'remember me', version: 2 }, { url: 'https://trial.passhub.net/', origin: 'https://trial.passhub.net', tab: { id: 77 } });
  assert.equal(r.id, '63 Ok');
  assert.equal(w.session.passhub.peer.tab.id, 77);
  assert.equal(w.session.passhub.version, 2);
  const x = await w.external({ id: 'whatever' });
  assert.match(x.farewell, /goodbye whatever/);
});
