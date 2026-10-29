import * as WWPass from 'wwpass-frontend';
import { lastModified, serverLog } from './utils';
import forge from 'node-forge';

let WebCryptoPrivateKey = null;
let ForgePrivateKey = null;
let publicKeyPem = null;

const ab2str = buf => String.fromCharCode.apply(null, new Uint16Array(buf));
const uint82str = buf => String.fromCharCode.apply(null, new Uint8Array(buf));

const str2uint8 = (str) => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
};

const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

const b64ToAb = (base64) => {
  const s = atob(base64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) {
    bytes[i] = s.charCodeAt(i);
  }
  return bytes.buffer;
};

const getSubtle = () => {
  const crypto = window.crypto || window.msCrypto;
  return crypto ? (crypto.webkitSubtle || crypto.subtle) : null;
};

const isIOS10 = () => navigator.userAgent.match('Version/10') && navigator.userAgent.match(/iPhone|iPod|iPad/i);

// DER definite-length encoding
const derLength = (len) => {
  if (len < 0x80) {
    return [len];
  }
  const bytes = [];
  for (let l = len; l > 0; l = Math.floor(l / 256)) {
    bytes.unshift(l % 256);
  }
  return [0x80 | bytes.length, ...bytes];
};

// Wrap PKCS#1 RSAPrivateKey (forge output, "BEGIN RSA PRIVATE KEY") into PKCS#8
// PrivateKeyInfo, the only private key format WebCrypto can import.
const pkcs1ToPkcs8 = (pkcs1) => {
  const version = [0x02, 0x01, 0x00];
  // AlgorithmIdentifier: rsaEncryption (1.2.840.113549.1.1.1), NULL params
  const algorithm = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octets = [0x04, ...derLength(pkcs1.length)];
  const bodyLen = version.length + algorithm.length + octets.length + pkcs1.length;
  const header = [0x30, ...derLength(bodyLen), ...version, ...algorithm, ...octets];
  const out = new Uint8Array(header.length + pkcs1.length);
  out.set(header, 0);
  out.set(pkcs1, header.length);
  return out;
};

const pem2CryptoKey = (pem) => {
  const isPkcs1 = /-----BEGIN RSA PRIVATE KEY-----/.test(pem);
  const b64 = pem
    .replace(/-----(BEGIN|END)[^-]*-----/g, '')
    .replace(/(Proc-Type|DEK-Info):[^\n]*/g, '')
    .replace(/\s+/g, '');
  const der = new Uint8Array(b64ToAb(b64));
  const pemAb = isPkcs1 ? pkcs1ToPkcs8(der) : der;

  if (isPkcs1) {
    serverLog("forge privateKey detected");
  }


  return getSubtle().importKey(
    'pkcs8',
    pemAb,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-1' },
    },
    false,
    ['decrypt'],
  )
    .then((key) => {
      // console.log('exiting pem2cryptokey');
      WebCryptoPrivateKey = key;
      return key;
    });
};

//---  create user
const str2ab = (str) => {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const bufView = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

const abToB64 = data => btoa(String.fromCharCode.apply(null, new Uint8Array(data)));

const encryptPrivateKey = (cPrivateKey, ticket) => {
  WebCryptoPrivateKey = cPrivateKey;
  return WWPass.cryptoPromise.getWWPassCrypto(ticket, 'AES-CBC')
    .then((thePromise) => {
      const iv = new Uint8Array([176, 178, 97, 142, 156, 31, 45, 30, 81, 210, 85, 14, 202, 203, 86, 240]);
      return getSubtle().encrypt(
        {
          name: 'AES-CBC',
          iv,
        },
        thePromise.clientKey,
        str2ab(cPrivateKey)
      ).then(abToB64);
    });
}
//end create user

// bind another WWPass key: the private key is encrypted with the client key of
// the current WWPass key, re-encrypt it with the client key of the new one
const reEncryptPrivateKey = (ePrivateKey, currentTicket, newTicket) => {
  const iv = new Uint8Array([176, 178, 97, 142, 156, 31, 45, 30, 81, 210, 85, 14, 202, 203, 86, 240]);
  return WWPass.cryptoPromise.getWWPassCrypto(currentTicket, 'AES-CBC')
    .then((currentCrypto) => getSubtle().decrypt(
      {
        name: 'AES-CBC',
        iv,
      },
      currentCrypto.clientKey,
      b64ToAb(ePrivateKey)
    ))
    .then((pemAb) => WWPass.cryptoPromise.getWWPassCrypto(newTicket, 'AES-CBC')
      .then((newCrypto) => getSubtle().encrypt(
        {
          name: 'AES-CBC',
          iv,
        },
        newCrypto.clientKey,
        pemAb
      )))
    .then(abToB64);
}


function getPrivateKey(data) {
  publicKeyPem = data.publicKeyPem;
  return WWPass.cryptoPromise
    .getWWPassCrypto(data.ticket, "AES-CBC")
    .then((thePromise) => {
      // console.log('after getWWPassCrypto');
      const iv = new Uint8Array([176, 178, 97, 142, 156, 31, 45, 30, 81, 210, 85, 14, 202, 203, 86, 240]);
      return getSubtle().decrypt(
        {
          name: 'AES-CBC',
          iv,
        },
        thePromise.clientKey,
        b64ToAb(data.ePrivateKey)
      ).then((ab) => {
        const pem = ab2str(ab);
        // console.log(pem)
        // keys generated by forge (PKCS#1) are converted to PKCS#8 and imported via WebCrypto;
        // forge is only a last-resort fallback for keys WebCrypto cannot parse
        return pem2CryptoKey(pem).catch((err) => {
          serverLog(`forge privateKey fallback: ${err && err.message}`);
          ForgePrivateKey = forge.pki.privateKeyFromPem(pem);
          return ForgePrivateKey;
        });
      });
    });
}



function getPrivateKeyOld(ePrivateKey, ticket) {

  return WWPass.cryptoPromise.getWWPassCrypto(ticket, 'AES-CBC')
    .then((thePromise) => {
      // console.log('after getWWPassCrypto');
      const iv = new Uint8Array([176, 178, 97, 142, 156, 31, 45, 30, 81, 210, 85, 14, 202, 203, 86, 240]);
      return getSubtle().decrypt(
        {
          name: 'AES-CBC',
          iv,
        },
        thePromise.clientKey,
        b64ToAb(ePrivateKey)
      ).then(ab2str)
        .then((pem) => {
          if (isIOS10() /* || navigator.userAgent.match(/edge/i) */) {
            ForgePrivateKey = forge.pki.privateKeyFromPem(pem);
            return ForgePrivateKey;
          }
          // return pem2CryptoKey(pem);
          return pem2CryptoKey(pem).catch(() => { // try old keys, generated in forge
            serverLog('forge privateKey');
            ForgePrivateKey = forge.pki.privateKeyFromPem(pem);
            return ForgePrivateKey;
          });
        })
        .catch((error) => {
          // TODO: pop it up
          console.log('error88:')
          console.log(error);
        });
    });
}

const forgeDecryptAesKey = async (eKeyH) => {
  const eKey = forge.util.hexToBytes(eKeyH);
  return ForgePrivateKey.decrypt(eKey, 'RSA-OAEP');
};


const decryptAesKey = (eKey) => {
  if (ForgePrivateKey) {
    return forgeDecryptAesKey(eKey);
  }

  let u8Key = fromHexString(eKey);

  return getSubtle().decrypt(
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-1' }, // Edge!
    },
    WebCryptoPrivateKey,
    u8Key
  ).then(abKey => uint82str(new Uint8Array(abKey))).catch((err) => console.log(err));
};

const encryptAesKey = (publicKey_Pem, pAesKey) => {
  const publicKey = forge.pki.publicKeyFromPem(publicKey_Pem);
  const encryptedAesKey = publicKey.encrypt(pAesKey, 'RSA-OAEP');
  const hexEncryptedAesKey = forge.util.bytesToHex(encryptedAesKey);
  return hexEncryptedAesKey;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const importSafeKey = (bstringKey) => getSubtle().importKey(
  'raw',
  str2uint8(bstringKey),
  { name: 'AES-GCM' },
  false,
  ['encrypt', 'decrypt'],
);

// bstringKey is still needed to wrap the key for RSA / group / ECB file keys
const generateSafeKey = async () => {
  const bstringKey = forge.random.getBytesSync(32);
  return { bstringKey, subtleKey: await importSafeKey(bstringKey) };
};

const u8ToB64 = (u8) => btoa(uint82str(u8));

const gcmEncrypt = async (key, cleartext, ivLength) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(ivLength));
  const encrypted = new Uint8Array(await getSubtle().encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    textEncoder.encode(cleartext),
  ));
  const tagStart = encrypted.length - 16; // WebCrypto appends the tag to the ciphertext
  return {
    iv: u8ToB64(iv),
    data: u8ToB64(encrypted.subarray(0, tagStart)),
    tag: u8ToB64(encrypted.subarray(tagStart)),
  };
};

const gcmDecrypt = async (key, { iv, data, tag }) => {
  const cleartext = await getSubtle().decrypt(
    { name: 'AES-GCM', iv: str2uint8(atob(iv)), tagLength: 128 },
    key,
    str2uint8(atob(data) + atob(tag)),
  );
  return textDecoder.decode(cleartext);
};

function encryptSafeName(newName, key) {
  return gcmEncrypt(key, newName, 12);
}

async function createGroup(name) {
  const { bstringKey, subtleKey } = await generateSafeKey();
  const eName = await encryptSafeName(name, subtleKey);
  const hexEncryptedAesKey = encryptAesKey(publicKeyPem, bstringKey);
  return { eName, aes_key: hexEncryptedAesKey, version: 3 };
};

function encryptGroupName(name, key) {  // rename group
  return encryptSafeName(name, key);
};

async function createSafe(name) {
  const { bstringKey, subtleKey } = await generateSafeKey();
  const eName = await encryptSafeName(name, subtleKey);
  const hexEncryptedAesKey = encryptAesKey(publicKeyPem, bstringKey);
  return { eName, aes_key: hexEncryptedAesKey, version: 3 };
};

async function createSafeFromFolder(folder, needBinaryKey = false) {
  const keys = await generateSafeKey();
  const hexEncryptedAesKey = encryptAesKey(publicKeyPem, keys.bstringKey);
  const result = {};
  result.key = hexEncryptedAesKey;
  result.eName = await encryptSafeName(folder.name, keys.subtleKey);
  result.version = 3;
  result.items = [];
  for (let e = 0; e < folder.items.length; e++) {
    result.items.push(await encryptItem(folder.items[e].cleartext, keys.subtleKey, folder.items[e].options));
  }
  result.folders = [];
  if ('folders' in folder) {
    for (let f = 0; f < folder.folders.length; f++) {
      result.folders.push(await encryptFolder(folder.folders[f], keys));
    }
  }
  if (!needBinaryKey) {
    return result;
  }
  return { safe: result, binaryKey: keys.bstringKey }
}

function convertFolderToSafe(folder, needBinaryKey = false) {
  return createSafeFromFolder(folder, needBinaryKey);
}

async function decryptSafeName(safe, key) {
  if (("version" in safe) && (safe.version == 3)) {   //
    return (await gcmDecrypt(key, safe.eName)).split('\0')[0];
  } else {
    return safe.name;
  }
}

// dstKeys: { bstringKey, subtleKey } of the destination safe
async function encryptFolder(folder, dstKeys) {
  const result = { items: [], folders: [] };
  if (folder.hasOwnProperty('name')) { // new, imported
    result.name = await encryptFolderName(folder.name, dstKeys.subtleKey);
  }
  if (folder.hasOwnProperty('_id')) { // merged, restore
    result._id = folder._id;
  }
  for (const item of folder.items) {
    let options = {}

    if (!("options" in item)) {  // who did it?
      if (item.note) {
        options["note"] = item.note;
      } else if (item.version === 5) {
        options["version"] = item.version;
      }
    } else {
      options = item.options;
    }

    if ("file" in item) { // only possible when moving Folder
      let newFileKey = moveFileKey(item, folder.safe.bstringKey, dstKeys.bstringKey);
      const eItem = JSON.parse(await encryptItem(item.cleartext, dstKeys.subtleKey, {}));
      eItem.file = Object.assign({}, { ...item.file });
      eItem.file.key = btoa(newFileKey);
      result.items.push(JSON.stringify(eItem));
    } else {
      result.items.push(await encryptItem(item.cleartext, dstKeys.subtleKey, options));
    }
  }
  for (let f = 0; f < folder.folders.length; f++) {
    result.folders.push(await encryptFolder(folder.folders[f], dstKeys));
  }
  return result;
}

async function decodeItemGCM(item, key) {
  return (await gcmDecrypt(key, item)).split('\0');
}


// in-place adds cleartext to the item; safe: { bstringKey, subtleKey }
async function decodeItem(item, safe) {

  if (item.history) {
    for (const i of item.history) {
      await decodeItem(i, safe);
    }
  }

  if ((item.version === 3) || (item.version === 4) || (item.version === 5)) {
    item.cleartext = await decodeItemGCM(item, safe.subtleKey);
    return;
  }

  // legacy AES-ECB versions: not available in WebCrypto
  const decipher = forge.cipher.createDecipher('AES-ECB', safe.bstringKey);
  decipher.start({ iv: forge.random.getBytesSync(16) });

  if (item.version === 1) {
    const encryptedData = forge.util.hexToBytes(item.creds);
    decipher.update(forge.util.createBuffer(encryptedData));
    const result = decipher.finish(); // check 'result' for true/false
    const creds = decipher.output.toString('utf8').split('\0');
    item.cleartext = [item.title, creds[0], creds[1], item.url, item.notes];
    return;
  }
  if (item.version === 2) {
    const encryptedData = forge.util.hexToBytes(item.data);
    decipher.update(forge.util.createBuffer(encryptedData));
    const result = decipher.finish(); // check 'result' for true/false
    let cleartext = decipher.output.toString('utf8').split('\0');
    item.cleartext = cleartext;
    return;
  }
  alert(`Error 450: cannot decode data version ${item.version}`); //  ??
  return null;
}

function decodeFolder(item, key) {
  return decodeItemGCM(item, key);
}

async function encryptFolderName(cleartextName, key) {
  return JSON.stringify({
    ...(await gcmEncrypt(key, cleartextName, 16)),
    version: 3,
  });
}

async function encryptClearText(cleartext, key) {
  const obj = await gcmEncrypt(key, cleartext.join('\0'), 16);
  obj.version = 3;
  return obj;
}

async function encryptItemGCM(cleartext, key, options, history) {

  const obj = await encryptClearText(cleartext, key);

  if ((typeof (options) == "object") && ("version" in options)) {
    obj.version = options.version;
  } else if (cleartext.length === 6) {
    obj.version = 4;
  }

  const history_out = [];
  if (history) {
    for (const historyItem of history) {
      const obj = await encryptClearText(historyItem.cleartext, key);
      if (historyItem.lastModified) {
        obj["lastModified"] = historyItem.lastModified;
      }
      if ("version" in historyItem) {
        obj.version = historyItem.version;
      } else if (historyItem.cleartext.length === 6) {
        obj.version = 4;
      }
      history_out.push(obj)
    }

  }
  if (history_out.length > 0) {
    obj["history"] = history_out;
  }


  if (typeof options !== 'undefined') {
    // Object.assign "polifill"
    for (let prop1 in options) {
      obj[prop1] = options[prop1];
    }
  }

  return JSON.stringify(obj);
}


function encryptItem(item, key, options, history) {
  return encryptItemGCM(item, key, options, history);
}

// aesKey: binary string key of the safe, wraps the per-file key
function encryptFile(pFileContent, aesKey) {
  const fileArray = new Uint8Array(pFileContent);
  const fileAesKey = forge.random.getBytesSync(32);
  const fileCipher = forge.cipher.createCipher("AES-GCM", fileAesKey);
  const fileIV = forge.random.getBytesSync(12);
  fileCipher.start({ iv: fileIV });
  fileCipher.update(forge.util.createBuffer(fileArray));
  fileCipher.finish();
  const keyCipher = forge.cipher.createCipher(
    "AES-ECB",
    aesKey
  );
  const keyIV = forge.random.getBytesSync(16);
  keyCipher.start({ iv: keyIV });
  keyCipher.update(forge.util.createBuffer(fileAesKey));
  keyCipher.finish();
  return {
    fileInfo: JSON.stringify({
      version: 3,
      key: btoa(keyCipher.output.data),
      iv: btoa(fileIV),
      // data: btoa(fileCipher.output.data),
      tag: btoa(fileCipher.mode.tag.data),
    }),
    cFileContent: fileCipher.output.data
  }
}

const decryptFile = async (fileObj, safe) => {
  const filename = (await decodeItemGCM(fileObj.filename, safe.subtleKey))[0];
  const keyDecipher = forge.cipher.createDecipher('AES-ECB', safe.bstringKey);
  keyDecipher.start({ iv: atob(fileObj.file.iv) });
  keyDecipher.update(forge.util.createBuffer(atob(fileObj.file.key)));
  keyDecipher.finish();
  const fileAesKey = keyDecipher.output.data;
  const decipher = forge.cipher.createDecipher('AES-GCM', fileAesKey);
  decipher.start({ iv: atob(fileObj.file.iv), tag: atob(fileObj.file.tag) });
  decipher.update(forge.util.createBuffer(atob(fileObj.file.data)));
  const success = decipher.finish(); // got false actully, still decrypted ok????
  const { length } = decipher.output.data;
  const buf = new ArrayBuffer(length);
  const arr = new Uint8Array(buf);
  let i = -1;
  while (++i < length) {
    arr[i] = decipher.output.data.charCodeAt(i);
  }
  return { filename, buf };
};

function moveFileKey(item, srcBinaryKey, dstBinaryKey) {
  const keyDecipher = forge.cipher.createDecipher('AES-ECB', srcBinaryKey);
  keyDecipher.start({ iv: atob(item.file.iv) }); // any iv goes: AES-ECB
  keyDecipher.update(forge.util.createBuffer(atob(item.file.key)));
  keyDecipher.finish();
  const fileAesKey = keyDecipher.output.data;

  const keyCipher = forge.cipher.createCipher('AES-ECB', dstBinaryKey);
  const keyIV = forge.random.getBytesSync(16);
  keyCipher.start({ iv: keyIV });
  keyCipher.update(forge.util.createBuffer(fileAesKey));
  keyCipher.finish();
  return keyCipher.output.data;

}

// srcSafe, dstSafe: { bstringKey, subtleKey }
async function moveFile(item, srcSafe, dstSafe) {
  let newFileKey = moveFileKey(item, srcSafe.bstringKey, dstSafe.bstringKey);
  const pItem = await decodeItemGCM(item, srcSafe.subtleKey);
  const eItem = JSON.parse(await encryptItem(pItem, dstSafe.subtleKey, {}));

  eItem.file = Object.assign({}, { ...item.file });
  eItem.file.key = btoa(newFileKey);
  return JSON.stringify(eItem);
}

function encryptSafeKey(safeKey, keyEncriptingKey) {  // for Group
  const cleartextData = safeKey;
  const cipher = forge.cipher.createCipher('AES-GCM', keyEncriptingKey);
  const iv = forge.random.getBytesSync(16);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(cleartextData)); // already joined by encode_item (
  const result = cipher.finish(); // check 'result' for true/false

  const obj = {
    iv: btoa(iv),
    data: btoa(cipher.output.data),
    tag: btoa(cipher.mode.tag.data),
  };
  return obj;
}

function decryptSafeKey(encryptedSafeKey, keyEncriptingKey) {  // for Group
  const decipher = forge.cipher.createDecipher('AES-GCM', keyEncriptingKey);
  decipher.start({ iv: atob(encryptedSafeKey.iv), tag: atob(encryptedSafeKey.tag) });
  decipher.update(forge.util.createBuffer(atob(encryptedSafeKey.data)));
  const pass = decipher.finish();
  return decipher.output.data;
}

function setPublicKey(aKey) {
  publicKeyPem = aKey;
}


export {
  encryptPrivateKey, // create user
  setPublicKey,  // crteate user
  reEncryptPrivateKey, // bind another WWPass key
  getPrivateKey,
  decryptAesKey,
  importSafeKey,
  encryptAesKey,
  decodeItem,
  decodeFolder,
  decryptSafeName,
  encryptSafeName,
  createGroup,
  encryptGroupName,
  createSafe,
  createSafeFromFolder,
  convertFolderToSafe,
  encryptFolderName,
  encryptFolder,
  encryptItem,
  encryptFile,
  decryptFile,
  str2uint8,
  moveFile,
  encryptSafeKey, // for groups
  decryptSafeKey,
};
