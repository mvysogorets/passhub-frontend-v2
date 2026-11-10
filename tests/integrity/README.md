# Passkey integrity tests

Zero-dependency (`node:test`, Node >= 22). Run: `npm run test:integrity`

| File | What it proves |
|---|---|
| 01-webauthn-crypto | Registration/assertion output of `passkey-generator.js` is spec-valid and verifiable by an independent verifier (node:crypto + own CBOR parser) |
| 02-passkey-model | Encrypted item encode/decode, exclude-list and safe-eligibility rules |
| 03-extension-static | Extension manifest/files, extension id vs. frontend ids, message-id contract, PassHub host not intercepted |
| 04-page-flow | `passkeyInterceptor.js` + `passkeyBridge.js` in a simulated page with a real authenticator behind them |
| 05-background | `background.js` routing with a mock `chrome.*` |
| 06-deployment | Live, read-only checks of the deployed site, and that the deployed bundle == local build |

Env: `PASSHUB_SITE` (default https://trial.passhub.net), `PASSHUB_EXTENSION_DIR` (default ../passhub-extension-passkey-mvv),
`INTEGRITY_OFFLINE=1`, `INTEGRITY_SKIP_BUILD=1`.

Not covered (needs a real browser + WWPass login): end-to-end click-through of the popup UI.
