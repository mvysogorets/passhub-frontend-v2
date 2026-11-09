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
import { b64ToAb, encryptAesKey, encryptItem } from "./crypto";
import { encodePasskeyCleartext /*, hasExcludedPasskey, isDirectWritableSafe */ } from "./passkey";
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
        const { passkey, safeKey } = found[chosen];
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



async function savePasskey(safe, encryptedPasskeyItem) {
    try {
        const response = await axios.post(`${getApiUrl()}items.php`, {
            verifier: getVerifier(),
            vault: safe.id,
            folder: 0,
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
            const anySafe = getAnySafe();
            const aesKey = anySafe.bstringKey;
            console.log('got msg passkey-create', message);
            const [newPasskey, response] = await create(message, aesKey);
            console.log('new passkey ', newPasskey);

            const a = await savePasskey(anySafe, newPasskey);
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
