const PASSKEY_PAYLOAD_INDEX = 5;

function encodePasskeyCleartext(displayFields, passkey) {
  return [
    ...(displayFields || []).slice(0, PASSKEY_PAYLOAD_INDEX),
    JSON.stringify({ type: "passkey", passkey }),
  ];
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
    } catch (_error) {}
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

export {
  encodePasskeyCleartext,
  hydratePasskeyItem,
  isDirectWritableSafe,
};
