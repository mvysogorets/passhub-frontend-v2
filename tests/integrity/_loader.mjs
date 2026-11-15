import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('.') && ctx.parentURL && !/\.[a-z]+$/i.test(spec)) {
    for (const ext of ['.js', '.jsx']) {
      const u = new URL(spec + ext, ctx.parentURL);
      if (fs.existsSync(fileURLToPath(u))) return next(u.href, ctx);
    }
  }
  return next(spec, ctx);
}
