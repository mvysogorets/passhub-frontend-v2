import { getUserData } from "./userData";
import {
  isPasswordItem,
  isFileItem,
  isBankCardItem,
  isPasskeyItem,
  isNoteItem,
} from "./utils";

import { getTOTP, getTOTP2 } from "./totp";
import { decodeEncryptedPasskey, normalizeCredentialId } from "./passkey";


const paymentCards = () => {
  const cards = [];
  const safes = getUserData().safes;
  for (const safe of safes) {
    if (safe.key) {
      // key!= null => confirmed, better have a class
      for (const item of safe.rawItems) {
        if (item.version === 5 && item.cleartext[0] === "card") {
          const cleartext = [...item.cleartext];
          cleartext[3] = cleartext[3].replace(/\D/g, "");
          cards.push({
            safe: safe.name,
            title: cleartext[1],
            card: cleartext,
          });
        }
      }
    }
  }
  return { id: "payment", found: cards };
};

const addressRecords = () => {
  const foundRecords = [];
  const safes = getUserData().safes;
  for (const safe of safes) {
    if (safe.key) {
      // key!= null => confirmed, better have a class
      for (const item of safe.rawItems) {
        if (item.version === 5 && item.cleartext[0] === "addr") {
          const cleartext = [...item.cleartext];
          foundRecords.push({
            safe: safe.name,
            title: cleartext[1],
            address: cleartext,
          });
        }
      }
    }
  }
  return { id: "address", found: foundRecords };
};


function wildcardHostMatch(pattern, hostname) {
  const escapedPattern = pattern
    .replace(/([.+^${}()|[\]\\])/g, "\\$1")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  const matcher = new RegExp(`^${escapedPattern}$`);
  const result = matcher.test(hostname);
  return result;
}

function hostInItem(hostname, item) {
  const urls = item.cleartext[3].split("\x01");

  for (let url of urls) {
    if (url.length == 0) {
      continue;
    }

    try {
      url = url.toLowerCase();
      if (url.substring(0, 4) != "http") {
        url = "https://" + url;
      }
      url = new URL(url);
      let itemHost = url.hostname.toLowerCase();
      if (itemHost.substring(0, 4) === "www.") {
        itemHost = itemHost.substring(4);
      }

      if (wildcardHostMatch(decodeURI(itemHost), hostname)) {
        return true;
      }
    } catch (err) {
      console.log(err);
    }
  }
  return false
}

// rpId may be stored as a bare domain or (when created without rp.id) as a full URL
function rpIdToHost(rpId) {
  let s = String(rpId || "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("://")) {
    try {
      s = new URL(s).hostname;
    } catch (_e) {
      return "";
    }
  }
  return s;
}

// WebAuthn: the request rpId must equal the page host or be its registrable suffix
function rpIdMatches(storedRpId, requestedRpId) {
  const stored = rpIdToHost(storedRpId);
  const requested = rpIdToHost(requestedRpId);
  return stored !== "" && stored === requested;
}

// "passkey-get": return passkeys usable for message.options.publicKey (rpId, allowCredentials)
function passkeySearch(what) {
  const publicKey = what.options?.publicKey || {};
  let rpId = publicKey.rpId;
  if (!rpId && what.url) {
    try {
      rpId = new URL(what.url).hostname;
    } catch (_e) { /* ignore */ }
  }

  const allowed = new Set(
    (publicKey.allowCredentials || [])
      .filter((c) => c && (!c.type || c.type === "public-key"))
      .map((c) => normalizeCredentialId(c.id))
      .filter(Boolean)
  );


  const found = [];
  try {
    if (rpId) {
      for (const safe of getUserData().safes) {
        if (!safe.key) continue; // not confirmed
        for (const item of safe.items) {
          if (isPasskeyItem(item)) {
            const passkey = JSON.parse(item.cleartext[5]);
            if (!passkey || !rpIdMatches(passkey.rpId, rpId)) continue;
            if (allowed.size && !allowed.has(normalizeCredentialId(passkey.credentialId))) continue;
            found.push({
              safe: safe.name,
              title: item.cleartext[0],
              username: item.cleartext[3],
              item,
              safeKey: safe.bstringKey,
              passkey

              //          passkey,
            });

          }
        }
      }
    }
  } catch (error) {
    console.error("passkey search failed:", error);
  }




  return { id: "passkey-get-response", rpId, found };
}

async function advise(what) {
  if (what.id === "passkey-get") {
    return passkeySearch(what);
  }

  if (what.id === "payment page") {
    return paymentCards();
  }

  if (what.id === "address page") {
    return addressRecords();
  }

  const safes = getUserData().safes;

  if (what.id === "advise request" || what.id === "not a payment page") {
    const u = new URL(what.url);
    let hostname = u.hostname.toLowerCase();
    if (hostname.substring(0, 4) === "www.") {
      hostname = hostname.substring(4);
    }
    const result = [];
    if (hostname) {
      for (const safe of safes) {
        if (safe.key) {
          // key!= null => confirmed, better have a class
          const items = safe.rawItems;
          for (const item of items) {
            if (isPasswordItem(item)) {
              if (hostInItem(hostname, item)) {
                if ((item.cleartext.length > 5) && (item.cleartext[5].length > 0)) {
                  const secret = item.cleartext[5];

                  let [totp, totp_next] = await getTOTP2(secret)
                  result.push({
                    safe: safe.name,
                    title: item.cleartext[0],
                    username: item.cleartext[1],
                    password: item.cleartext[2],
                    totp,
                    totp_next
                  });
                } else {
                  result.push({
                    safe: safe.name,
                    title: item.cleartext[0],
                    username: item.cleartext[1],
                    password: item.cleartext[2],
                  })
                }
              }
            }
          }
        }
      }
    }
    return { id: "advise", hostname, found: result };
  }
};

const searchFolders = (what, searchType = 'All') => {

  const safes = getUserData().safes;

  const result = [];
  const lcWhat = what.toLowerCase();
  for (const safe of safes) {
    if (safe.key) {
      // key!= null => confirmed, better have a class
      for (const folder of safe.rawFolders) {
        if (folder.cleartext[0].toLowerCase().indexOf(lcWhat) >= 0) {
          result.push(folder);
        }
      }
    }
  }

  result.sort((a, b) =>
    a.cleartext[0].toLowerCase().localeCompare(b.cleartext[0].toLowerCase())
  );
  return result;
}

const search = (what, searchType = '--All--') => {

  const safes = getUserData().safes;
  const result = [];

  const lcWhat = what.toLowerCase();
  for (const safe of safes) {
    if (safe.key) {
      // key!= null => confirmed, better have a class
      for (const item of safe.rawItems) {
        let found = false;
        if (searchType == 'Cards' && !isBankCardItem(item)) {
          //          console.log('not a card');
          continue;
        }
        if (searchType == 'Files' && !isFileItem(item)) {
          //          console.log('not a file');
          continue;
        }
        if ((searchType == 'Files' || searchType == 'Cards') && what == '') {
          found = true
        } else if (item.cleartext.length == 8) {
          // card
          if (item.cleartext[1].toLowerCase().indexOf(lcWhat) >= 0) {
            found = true;
          } else if (item.cleartext[2].toLowerCase().indexOf(lcWhat) >= 0) {
            found = true;
          } else if (item.cleartext[3].toLowerCase().indexOf(lcWhat) >= 0) {
            found = true;
          } else if (item.cleartext[4].toLowerCase().indexOf(lcWhat) >= 0) {
            found = true;
          }
        } else {
          try {
            if (item.cleartext[0].toLowerCase().indexOf(lcWhat) >= 0) {
              found = true;
            } else if (item.cleartext[1].toLowerCase().indexOf(lcWhat) >= 0) {
              found = true;
            } else if (item.cleartext[3].toLowerCase().indexOf(lcWhat) >= 0) {
              found = true;
            } else if (item.cleartext[4].toLowerCase().indexOf(lcWhat) >= 0) {
              found = true;
            }
          } catch (error) {
            console.log(error);
            console.log(item);
          }
        }
        if (found) {
          result.push(item);
        }
      }
    }
  }

  result.sort((a, b) =>
    a.cleartext[0].toLowerCase().localeCompare(b.cleartext[0].toLowerCase())
  );

  return result;
}


export {
  advise,
  search,
  searchFolders
};
