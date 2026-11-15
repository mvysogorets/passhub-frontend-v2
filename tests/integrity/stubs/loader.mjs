// Node ESM hook: lets passhub-passkey-api.js load outside the bundler.
// Extensionless relative imports get ".js"; modules that need the browser/app runtime are replaced by stubs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const stubDir = path.dirname(fileURLToPath(import.meta.url));
const stub = (name) => pathToFileURL(path.join(stubDir, name)).href;
const STUBS = { axios: 'axios.mjs', crypto: 'crypto.mjs', userData: 'userData.mjs', search: 'search.mjs', utils: 'utils.mjs' };

export async function resolve(spec, ctx, next) {
  if (spec === 'axios') return { url: stub('axios.mjs'), shortCircuit: true };
  if (spec.startsWith('.') && ctx.parentURL?.includes('/src/')) {
    const base = spec.split('/').pop();
    if (STUBS[base]) return { url: stub(STUBS[base]), shortCircuit: true };
    if (!/\.[a-z]+$/i.test(spec)) {
      for (const ext of ['.js', '.jsx']) {
        const u = new URL(spec + ext, ctx.parentURL);
        if (fs.existsSync(fileURLToPath(u))) return next(u.href, ctx);
      }
    }
  }
  return next(spec, ctx);
}
