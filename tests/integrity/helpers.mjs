// Shared helpers for the passkey integrity tests.
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const frontendRoot = path.resolve(here, '..', '..');
export const extensionRoot = path.resolve(
  process.env.PASSHUB_EXTENSION_DIR || path.join(frontendRoot, '..', 'passhub-extension-passkey-mvv'));
export const SITE = process.env.PASSHUB_SITE || 'https://trial.passhub.net';

// The browser has Uint8Array.toBase64/fromBase64 (Chrome 140+); Node 22 does not.
if (!Uint8Array.prototype.toBase64) {
  Uint8Array.prototype.toBase64 = function ({ alphabet } = {}) {
    const s = Buffer.from(this).toString('base64');
    return alphabet === 'base64url' ? s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : s;
  };
  Uint8Array.fromBase64 = (s, { alphabet } = {}) => {
    if (alphabet === 'base64url' && /[+/=]/.test(s)) throw new SyntaxError('not base64url');
    return new Uint8Array(Buffer.from(s, alphabet === 'base64url' ? 'base64url' : 'base64'));
  };
}
// passkey-generator.js uses window.crypto
globalThis.window ??= globalThis;

export const importFrontend = (rel) => import(pathToFileURL(path.join(frontendRoot, rel)).href);
export const readExt = (rel) => fs.readFileSync(path.join(extensionRoot, rel), 'utf8');
export const readFront = (rel) => fs.readFileSync(path.join(frontendRoot, rel), 'utf8');

export const b64u = (bytes) => Buffer.from(bytes).toString('base64url');
export const fromB64u = (s) => new Uint8Array(Buffer.from(s, 'base64url'));
export const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));

// Minimal CBOR decoder (ints, byte/text strings, arrays, maps) - independent of the code under test.
export function cborDecode(bytes) {
  let o = 0;
  const read = () => {
    const ib = bytes[o++]; const major = ib >> 5; let ai = ib & 31;
    if (ai === 24) ai = bytes[o++];
    else if (ai === 25) { ai = (bytes[o] << 8) | bytes[o + 1]; o += 2; }
    else if (ai > 25) throw new Error('unsupported CBOR length ' + ai);
    switch (major) {
      case 0: return ai;
      case 1: return -1 - ai;
      case 2: { const v = bytes.slice(o, o + ai); o += ai; return v; }
      case 3: { const v = new TextDecoder().decode(bytes.slice(o, o + ai)); o += ai; return v; }
      case 4: return Array.from({ length: ai }, read);
      case 5: { const m = new Map(); for (let i = 0; i < ai; i++) { const k = read(); m.set(k, read()); } return m; }
      default: throw new Error('unsupported CBOR major ' + major);
    }
  };
  const value = read();
  return { value, consumed: o };
}

// Parse authenticatorData (WebAuthn 6.1)
export function parseAuthData(ad) {
  const dv = new DataView(ad.buffer, ad.byteOffset, ad.byteLength);
  const out = { rpIdHash: ad.slice(0, 32), flags: ad[32], counter: dv.getUint32(33, false) };
  if (out.flags & 0x40) {
    out.aaguid = ad.slice(37, 53);
    const len = dv.getUint16(53, false);
    out.credentialId = ad.slice(55, 55 + len);
    const { value, consumed } = cborDecode(ad.slice(55 + len));
    out.cose = value;
    out.trailing = ad.length - (55 + len + consumed);
  }
  return out;
}

export function coseToJwk(cose) {
  return { kty: 'EC', crv: 'P-256', x: b64u(cose.get(-2)), y: b64u(cose.get(-3)) };
}

// Run an extension script in a sandbox (as a classic script, like a content/service-worker script).
export function runInSandbox(file, sandbox) {
  sandbox.Uint8Array = Uint8Array; sandbox.ArrayBuffer = ArrayBuffer;
  sandbox.TextDecoder = TextDecoder; sandbox.TextEncoder = TextEncoder;
  sandbox.URL = URL; sandbox.Map = Map;
  vm.createContext(sandbox);
  vm.runInContext(readExt(file), sandbox, { filename: file });
  return sandbox;
}

// Inside a vm context `window` is the context's global proxy, not the sandbox object: events need it as `source`.
export const windowOf = (sandbox) => vm.runInContext('window', sandbox);
