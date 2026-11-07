const PASSKEY_PAYLOAD_INDEX = 5;

function normalizeCredentialId(value) {
  return String(value || "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodePasskeyCleartext(displayFields, passkey) {

  try {
    /*    
        const result = [
          ...(displayFields || []).slice(0, PASSKEY_PAYLOAD_INDEX),
          JSON.stringify({ type: "passkey", passkey }),
        ];
    */
    const a = (displayFields || []).slice(0, PASSKEY_PAYLOAD_INDEX);
    const b = JSON.stringify({ type: "passkey", passkey });
    const result = [...a, b];
    console.log(result)
    return result;

  } catch (e) {
    console.log('error 21 ', e);
    return "error 21";
  }

  /*
    return [
      ...(displayFields || []).slice(0, PASSKEY_PAYLOAD_INDEX),
      JSON.stringify({ type: "passkey", passkey }),
    ];
    */
}

function decodeEncryptedPasskey(item) {
  if (item?.version !== 6) return null;

  const payload = item.cleartext?.[PASSKEY_PAYLOAD_INDEX];
  if (payload) {
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.type === "passkey" && parsed.passkey) {
        return parsed.passkey;
      }
    } catch (_error) { }
  }

  return null;
}

function hydratePasskeyItem(item) {
  const passkey = decodeEncryptedPasskey(item);
  if (!passkey) return item;

  item.type = "passkey";
  item.passkey = passkey;
  return item;
}

function isDirectWritableSafe(safe) {
  return Boolean(
    safe?.bstringKey
    && !safe.group
    && (safe.user_role === "administrator" || safe.user_role === "editor")
  );
}

function hasExcludedPasskey(safes, rpId, excludeCredentials = []) {
  if (!Array.isArray(excludeCredentials)) {
    throw new TypeError("excludeCredentials must be an array");
  }

  const excludedIds = new Set(
    excludeCredentials
      .filter(descriptor => descriptor?.type === "public-key")
      .map(descriptor => normalizeCredentialId(descriptor.id))
      .filter(Boolean)
  );
  if (!excludedIds.size) return false;

  for (const safe of safes || []) {
    if (!isDirectWritableSafe(safe)) continue;

    for (const item of safe.rawItems || safe.items || []) {
      if (item?.version !== 6 || item.type !== "passkey" || !item.passkey) continue;
      if (item.passkey.rpId !== rpId) continue;
      if (excludedIds.has(normalizeCredentialId(item.passkey.credentialId))) {
        return true;
      }
    }
  }

  return false;
}

export {
  encodePasskeyCleartext,
  decodeEncryptedPasskey,
  hasExcludedPasskey,
  hydratePasskeyItem,
  isDirectWritableSafe,
  normalizeCredentialId,
};
