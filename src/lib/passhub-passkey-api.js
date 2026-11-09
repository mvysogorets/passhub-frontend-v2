/**
 * passhub-passkey-api.js
 * 
 * Simple API for working with passkeys in PassHub.
 * Uses PasskeyGenerator and passkey_ops.php.
 * 
 * @copyright 2026 WWPass
 * @license MIT
 */

import axios from "axios";

import PasskeyGenerator from "./passkey-generator";
import { b64ToAb, decodeItem, encryptAesKey, encryptItem } from "./crypto";
import { decodeEncryptedPasskey, encodePasskeyCleartext, isDirectWritableSafe } from "./passkey";
import { getUserData } from "./userData";
import { advise } from "./search";
import { getApiUrl, getVerifier } from "../lib/utils";

function getAnySafe() {
    const u = getUserData();
    const s = u.safes[0];
    return s;
}



'use strict';

/**
* API for working with passkeys.
 */



async function create(message, aesKey) {
    const [passkey, passkeyCreateResponse] = await PasskeyGenerator.createPasskey(message, aesKey);
    console.log('39 passkey', passkey);
    const encodedPasskey = encodePasskeyCleartext(passkey.cleartext, passkey.passkey);
    console.log('41 ', encodedPasskey);
    const encryptedPasskey = encryptItem(
        encodedPasskey,
        aesKey,
        {
            version: 6,
        }
    );
    return [encryptedPasskey, passkeyCreateResponse];
}

// Ask the extension to show a popup with the candidates; resolves to the chosen index or null.
// Secrets (passkey, safeKey, item) are never sent, only display fields.
async function chooseFound(found, rpId, askExtension) {
    if (found.length === 1) return 0;
    if (!askExtension) return 0; // no way to ask: fall back to the first one
    const candidates = found.map((f, index) => ({
        index,
        origin: f.passkey?.rpId || rpId,
        username: f.username,
        title: f.title,
        safe: f.safe,
    }));
    const reply = await askExtension({ id: "passkey-choose", rpId, candidates });
    if (!reply || reply.cancelled || reply.error) return null;
    const idx = Number(reply.index);
    return Number.isInteger(idx) && idx >= 0 && idx < found.length ? idx : null;
}

// Let the user pick the location (a safe or a folder of a safe) for a new passkey in the extension popup.
// Resolves to { safe, folder } (folder is the folder id, 0 for the safe root) or null.
// Only names and the tree structure are sent to the extension, never keys.
async function chooseLocation(askExtension) {
    const safes = (getUserData().safes || []).filter(isDirectWritableSafe);
    if (safes.length === 0) return null;

    const locations = []; // index -> { safe, folder }
    const candidates = []; // flat tree: parent is an index in candidates or -1
    const addFolders = (safe, folders, parent) => {
        for (const f of folders || []) {
            const index = candidates.length;
            candidates.push({ index, name: f.name, parent });
            locations.push({ safe, folder: f.id });
            addFolders(safe, f.folders, index);
        }
    };
    for (const safe of safes) {
        const index = candidates.length;
        candidates.push({ index, name: safe.name, parent: -1, isSafe: true });
        locations.push({ safe, folder: 0 });
        addFolders(safe, safe.folders, index);
    }

    if (candidates.length === 1 || !askExtension) return locations[0];

    const reply = await askExtension({
        id: "passkey-choose",
        title: "Choose where to save the new passkey",
        tree: true,
        candidates,
    });
    if (!reply || reply.cancelled || reply.error) return null;
    const idx = Number(reply.index);
    return Number.isInteger(idx) && idx >= 0 && idx < locations.length ? locations[idx] : null;
}

// Find an item (by id) and its safe in the current userData.
function findItem(entryId) {
    for (const safe of getUserData().safes || []) {
        if (!safe.key) continue;
        for (const item of safe.rawItems || []) {
            if (String(item._id) === String(entryId)) return { safe, item };
        }
    }
    return null;
}

// Read ONE item from the server (not the whole user data) and decode it with the safe key.
async function readItem(safe, entryId) {
    const response = await axios.post(`${getApiUrl()}items.php`, {
        verifier: getVerifier(),
        vault: safe.id,
        read: true,
        entryID: entryId,
    });
    const result = response.data;
    if (result?.status === "login") {
        window.location.href = "expired.php";
        throw new Error("PassHub session expired");
    }
    if (result?.status !== "Ok" || !result.item) {
        throw new Error(result?.status || "Passkey could not be read");
    }
    const item = result.item;
    decodeItem(item, safe.bstringKey); // adds cleartext and, for passkeys, item.passkey
    return item;
}

// Reread the passkey item from the server, increase its counter by one and save it back
// (compare-and-swap on the item revision, retried if the item changed meanwhile).
// Returns the passkey with the saved counter: the value to be used in this authentication.
async function incrementPasskeyCounter(entryId) {
    const hit = findItem(entryId); // locates the safe (and its key) only, no item data is trusted
    if (!hit) throw new Error("Passkey not found");
    const { safe, item: localItem } = hit;

    for (let attempt = 0; attempt < 3; attempt++) {
        const item = await readItem(safe, entryId); // fresh item with its current revision
        const passkey = decodeEncryptedPasskey(item);
        if (!passkey) throw new Error("Passkey not found");

        const updatedPasskey = { ...passkey, counter: (Number(passkey.counter) || 0) + 1 };
        const cleartext = (item.cleartext || []).slice(0, 5);
        const encodedCleartext = encodePasskeyCleartext(cleartext, updatedPasskey);
        const encryptedData = encryptItem(
            encodedCleartext,
            safe.bstringKey,
            { version: 6 }
        );
        const response = await axios.post(`${getApiUrl()}items.php`, {
            verifier: getVerifier(),
            vault: safe.id,
            folder: item.folder || 0,
            entryID: item._id,
            expectedRevision: item.revision || 0,
            encrypted_data: encryptedData,
        });
        const status = response.data?.status;
        if (status === "login") {
            window.location.href = "expired.php";
            throw new Error("PassHub session expired");
        }
        if (status === "Ok") {
            // keep the in-memory copy consistent with the server
            const saved = response.data.item;
            if (saved) {
                Object.assign(localItem, {
                    iv: saved.iv,
                    data: saved.data,
                    tag: saved.tag,
                    revision: saved.revision,
                    lastModified: saved.lastModified,
                    version: saved.version,
                });
                localItem.cleartext = encodedCleartext;
                localItem.passkey = updatedPasskey;
            }
            return { passkey: updatedPasskey, safeKey: safe.bstringKey };
        }
        if (status !== "Conflict") {
            throw new Error(status || "Passkey counter could not be saved");
        }
        // Conflict: somebody changed the item, reread and try again
    }
    throw new Error("Passkey counter could not be saved (conflict)");
}

async function get(message, askExtension) {
    const result = await advise(message);
    console.log('53 result', result);
    const { rpId, found } = result;
    console.log('foundKeys', found);
    console.log('rpId', rpId);

    if (!found || found.length === 0) {
        return { id: "passkey-get-response", error: "No matching passkey", errorName: "NotAllowedError" };
    }

    try {
        const chosen = await chooseFound(found, rpId, askExtension);
        if (chosen === null) {
            return { id: "passkey-get-response", error: "Passkey selection cancelled", errorName: "NotAllowedError" };
        }
        // the counter must be stored before the assertion is made
        const { passkey, safeKey } = await incrementPasskeyCounter(found[chosen].item._id);
        const publicKey = message.options.publicKey;
        const assertion = await PasskeyGenerator.usePasskey(
            passkey,
            PasskeyGenerator.base64UrlToArrayBuffer(publicKey.challenge), // base64url -> bytes
            safeKey,
            {
                origin: message.options.origin,
                rpId: publicKey.rpId || rpId,
                userVerification: publicKey.userVerification,
            }
        );
        // all binary fields are base64url strings
        return { id: "passkey-get-response", assertion };
    } catch (e) {
        console.log('error in get ', e);
        return { id: "passkey-get-response", error: String(e?.message || e), errorName: "NotAllowedError" };
    }
}



async function savePasskey(safe, encryptedPasskeyItem, folder = 0) {
    try {
        const response = await axios.post(`${getApiUrl()}items.php`, {
            verifier: getVerifier(),
            vault: safe.id,
            folder,
            encrypted_data: encryptedPasskeyItem,
        });
        const result = response.data;

        if (result.status === "login") {
            props.onError("PassHub session expired");
            window.location.href = "expired.php";
            return;
        }
        if (result.status !== "Ok") {
            throw new Error(result.status || "Passkey could not be saved");
        }
        return result.status;

    } catch (e) {
        console.log('79 error ', e)
    }
}


async function passkeyRequest(message, askExtension) {
    /*    
        if (['passkey-create', 'passkey-get'].includes(message.id)) {
            try {
                message.options.publicKey.user.id = b64ToAb(message.options.publicKey.user.id);
                message.options.publicKey.challenge = b64ToAb(message.options.publicKey.challenge);
            } catch (error) {
                console.error(error);
            }
        }
    */

    if (message.id == 'passkey-create') {
        try {
            const location = await chooseLocation(askExtension);
            if (!location) {
                return {
                    id: "passkey-create-response",
                    error: "No safe or folder selected",
                    errorName: "NotAllowedError",
                    requestId: message.requestId,
                };
            }
            const anySafe = location.safe;
            const aesKey = anySafe.bstringKey;
            console.log('got msg passkey-create', message);
            const [newPasskey, response] = await create(message, aesKey);
            console.log('new passkey ', newPasskey);

            const a = await savePasskey(anySafe, newPasskey, location.folder);
            //        const response = await createCredentialForSite(newPasskey, options);


            console.log('98 a ', a);
            return { id: "passkey-create-response", response, requestId: message.requestId };
        } catch (e) {
            console.log('error 108 ', e);
        }
    }
    if (message.id == 'passkey-get') {
        console.log('got msg passkey-create', message);

        // requestId lets the extension deliver the answer to the page that asked
        const reply = await get(message, askExtension);
        return { ...reply, requestId: message.requestId };
    }
}

// console.log('Extension bridge listener registered');

export { passkeyRequest };
