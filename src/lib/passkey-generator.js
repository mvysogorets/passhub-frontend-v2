/**
 * passkey-generator.js
 * 
 * Client-side generation and management of Passkey for PassHub
 * 
 * @copyright 2026 WWPass
 * @license MIT
 */
const PasskeyGenerator = (() => {
    'use strict';

    /**
     * Generate a new key pair for the passkey
     * @returns {Promise<CryptoKeyPair>}
     */
    async function generateKeyPair() {
        return await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,  // extractable
            ["sign", "verify"]
        );
    }

    /**
     * Export a key to JWK format
     * @param {CryptoKey} key
     * @returns {Promise<Object>}
     */
    async function exportKeyToJwk(key) {
        return await window.crypto.subtle.exportKey("jwk", key);
    }

    function binaryStringToBytes(value) {
        return Uint8Array.from(value, character => character.charCodeAt(0));
    }

    async function importWrappingKey(safeKey) {
        return await window.crypto.subtle.importKey(
            "raw",
            binaryStringToBytes(safeKey),
            { name: "AES-GCM" },
            false,
            ["wrapKey", "unwrapKey"]
        );
    }

    async function wrapPrivateKey(privateKey, safeKey) {
        const wrappingKey = await importWrappingKey(safeKey);
        const iv = generateRandomBytes(12);
        const wrappedKey = await window.crypto.subtle.wrapKey(
            "jwk",
            privateKey,
            wrappingKey,
            { name: "AES-GCM", iv }
        );

        return JSON.stringify({
            version: 1,
            format: "jwk",
            algorithm: "AES-GCM",
            iv: arrayBufferToBase64Url(iv),
            wrappedKey: arrayBufferToBase64Url(wrappedKey)
        });
    }

    async function unwrapPrivateKey(wrappedPrivateKey, safeKey) {
        const envelope = JSON.parse(wrappedPrivateKey);
        if (envelope.version !== 1 || envelope.format !== "jwk" || envelope.algorithm !== "AES-GCM") {
            throw new Error("Unsupported wrapped passkey format");
        }

        const wrappingKey = await importWrappingKey(safeKey);
        return await window.crypto.subtle.unwrapKey(
            "jwk",
            base64ToArrayBuffer(envelope.wrappedKey),
            wrappingKey,
            {
                name: "AES-GCM",
                iv: new Uint8Array(base64ToArrayBuffer(envelope.iv))
            },
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            false,
            ["sign"]
        );
    }

    /**
     * Generate a random byte array
     * @param {number} length
     * @returns {Uint8Array}
     */
    function generateRandomBytes(length) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Convert ArrayBuffer to Base64
     * @param {ArrayBuffer} buffer
     * @returns {string}
     */
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function arrayBufferToBase64Url(buffer) {
        return arrayBufferToBase64(buffer)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Convert Base64 to ArrayBuffer
     * @param {string} base64
     * @returns {ArrayBuffer}
     */
    function base64ToArrayBuffer(base64) {
        const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
        const binary = window.atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Create a new Passkey
     * @param {string} siteName - Site name
     * @param {string} username - Username or email
     * @param {string} rpId - Relying Party ID (domain)
     * @param {string} safeKey - Binary AES key of the selected safe
     * @param {string} userHandle - RP-provided user.id encoded as Base64URL
     * @returns {Promise<Object>} Passkey structure for storage
     */
    async function createPasskey(siteName, username, rpId, safeKey, userHandle) {
        if (!userHandle) {
            throw new Error("Passkey user handle is required");
        }

        // Generate a key pair
        const keyPair = await generateKeyPair();

        // Export only the public key. The private key is wrapped inside Web Crypto.
        const publicKeyJwk = await exportKeyToJwk(keyPair.publicKey);

        // Generate credential ID (16 bytes)
        const credentialId = generateRandomBytes(16);

        const wrappedPrivateKey = await wrapPrivateKey(keyPair.privateKey, safeKey);

        // Form the passkey structure
        const passkeyData = {
            credentialId: arrayBufferToBase64Url(credentialId),
            privateKey: wrappedPrivateKey,
            publicKey: JSON.stringify(publicKeyJwk),
            userHandle: userHandle,
            counter: 0,
            rpId: rpId,
            created: new Date().toISOString()
        };

        // Form the cleartext data
        const cleartext = [
            siteName,
            siteName,
            username,
            rpId,
            `Passkey created on ${new Date().toLocaleDateString()}`
        ];

        return {
            version: 6,
            type: 'passkey',
            cleartext: cleartext,
            passkey: passkeyData
        };
    }

    /**
     * Use an existing passkey for authentication
     * @param {Object} passkey - Passkey structure from PassHub
     * @param {ArrayBuffer} challenge - Challenge from the server
     * @param {string} safeKey - Binary AES key of the passkey safe
     * @returns {Promise<Object>} Assertion to send to the server
     */
    async function usePasskey(passkey, challenge, safeKey, options = {}) {
        const privateKey = await unwrapPrivateKey(passkey.privateKey, safeKey);

        // Create authenticatorData
        const rpIdHash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(passkey.rpId)
        );

        // Flags: User Present (0x01) + User Verified (0x04) = 0x05
        const flags = new Uint8Array([0x05]);

        // Counter (4 bytes, big-endian)
        const counter = new Uint8Array(4);
        new DataView(counter.buffer).setUint32(0, passkey.counter + 1, false);

        // Assemble authenticatorData
        const authenticatorData = new Uint8Array([
            ...new Uint8Array(rpIdHash),
            ...flags,
            ...counter
        ]);

        // Create clientDataJSON
        const clientData = {
            type: 'webauthn.get',
            challenge: arrayBufferToBase64Url(challenge),
            origin: options.origin || window.location.origin,
            crossOrigin: false
        };
        const clientDataJSON = new TextEncoder().encode(JSON.stringify(clientData));

        // Create data to sign
        const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSON);
        const dataToSign = new Uint8Array([
            ...authenticatorData,
            ...new Uint8Array(clientDataHash)
        ]);

        // Sign
        const signature = await crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" }
            },
            privateKey,
            dataToSign
        );
        const verificationKey = await crypto.subtle.importKey(
            'jwk',
            JSON.parse(passkey.publicKey),
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify']
        );
        const signatureSelfVerified = await crypto.subtle.verify(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            verificationKey,
            signature,
            dataToSign
        );
        if (!signatureSelfVerified) {
            throw new Error('Passkey signature self-verification failed');
        }
        const derSignature = ecdsaSignatureToDer(signature);
        const userHandleLength = passkey.userHandle
            ? base64ToArrayBuffer(passkey.userHandle).byteLength
            : 0;

        console.info('[PassHub WebAuthn] assertion diagnostics', JSON.stringify({
            rpId: passkey.rpId,
            requestedRpId: options.rpId || passkey.rpId,
            rpIdMatches: !options.rpId || options.rpId === passkey.rpId,
            origin: clientData.origin,
            crossOrigin: clientData.crossOrigin,
            requestedUserVerification: options.userVerification || 'preferred',
            uvPolicy: 'authenticated PassHub session; no per-operation step-up',
            flags: `0x${flags[0].toString(16).padStart(2, '0')}`,
            userPresent: Boolean(flags[0] & 0x01),
            userVerified: Boolean(flags[0] & 0x04),
            backupEligible: Boolean(flags[0] & 0x08),
            backupState: Boolean(flags[0] & 0x10),
            signCount: passkey.counter + 1,
            credentialId: passkey.credentialId,
            userHandleLength,
            authenticatorDataLength: authenticatorData.byteLength,
            signatureSelfVerified,
            signatureFormat: new Uint8Array(derSignature)[0] === 0x30 ? 'DER' : 'unknown',
            signatureLength: derSignature.byteLength
        }));

        return {
            credentialId: passkey.credentialId,
            authenticatorData: arrayBufferToBase64(authenticatorData),
            clientDataJSON: arrayBufferToBase64(clientDataJSON),
            signature: arrayBufferToBase64(derSignature),
            userHandle: passkey.userHandle
        };
    }

    function ecdsaSignatureToDer(signature) {
        const bytes = new Uint8Array(signature);
        if (bytes.length !== 64) return signature;

        const encodeInteger = value => {
            let offset = 0;
            while (offset < value.length - 1 && value[offset] === 0) offset++;
            const trimmed = value.slice(offset);
            return trimmed[0] & 0x80
                ? new Uint8Array([0, ...trimmed])
                : trimmed;
        };
        const r = encodeInteger(bytes.slice(0, 32));
        const s = encodeInteger(bytes.slice(32));

        return new Uint8Array([
            0x30, 4 + r.length + s.length,
            0x02, r.length, ...r,
            0x02, s.length, ...s
        ]).buffer;
    }

    /**
     * Create a WebAuthn PublicKeyCredential for registration on an external site
     * @param {Object} passkey - Passkey from PassHub
     * @param {Object} options - PublicKeyCredentialCreationOptions from the site
     * @param {Function} decryptFn - Decryption function
     * @returns {Promise<Object>} Credential response for the site
     */
    async function createCredentialForSite(passkey, options, decryptFn) {
        // Create authenticatorData for attestation
        const rpIdHash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(passkey.rpId)
        );

        // Flags: UP (0x01) + UV (0x04) + AT (0x40) = 0x45
        const flags = new Uint8Array([0x45]);

        // Counter (4 bytes, big-endian)
        const counter = new Uint8Array(4);

        // AAGUID (16 zeros for software authenticator)
        const aaguid = new Uint8Array(16);

        // Credential ID length (2 bytes)
        const credIdBytes = base64ToArrayBuffer(passkey.credentialId);
        const credIdLength = new Uint8Array(2);
        new DataView(credIdLength.buffer).setUint16(0, credIdBytes.byteLength, false);

        // Public key (COSE format)
        const publicKeyJwk = JSON.parse(passkey.publicKey);
        const coseKey = jwkToCose(publicKeyJwk);

        // Assemble attestedCredentialData
        const attestedCredentialData = new Uint8Array([
            ...aaguid,
            ...credIdLength,
            ...new Uint8Array(credIdBytes),
            ...coseKey
        ]);

        // Assemble the full authenticatorData
        const authenticatorData = new Uint8Array([
            ...new Uint8Array(rpIdHash),
            ...flags,
            ...counter,
            ...attestedCredentialData
        ]);

        // Create clientDataJSON
        const clientData = {
            type: 'webauthn.create',
            challenge: options.challenge,
            origin: options.origin,
            crossOrigin: false
        };
        const clientDataJSON = new TextEncoder().encode(JSON.stringify(clientData));

        // return {
        //     id: passkey.credentialId,
        //     rawId: passkey.credentialId,
        //     response: {
        //         attestationObject: createAttestationObject(authenticatorData),
        //         clientDataJSON: arrayBufferToBase64(clientDataJSON)
        //     },
        //     type: 'public-key'
        // };
        return {
            credentialId: passkey.credentialId,
            attestationObject: createAttestationObject(authenticatorData),
            clientDataJSON: arrayBufferToBase64(clientDataJSON)
        };
    }

    /**
     * Convert JWK to COSE format for ES256
     * COSE_Key format (RFC 8152)
     * @param {Object} jwk
     * @returns {Uint8Array}
     */
    function jwkToCose(jwk) {
        // COSE Key Parameters for ES256 (ECDSA P-256 + SHA-256)
        const coseKey = new Map();

        // Key type: EC2 (Elliptic Curve Keys w/ x- and y-coordinate pair)
        coseKey.set(1, 2);

        // Algorithm: ES256 (-7)
        coseKey.set(3, -7);

        // Curve: P-256 (1)
        coseKey.set(-1, 1);

        // x-coordinate
        const x = base64UrlToArrayBuffer(jwk.x);
        coseKey.set(-2, new Uint8Array(x));

        // y-coordinate
        const y = base64UrlToArrayBuffer(jwk.y);
        coseKey.set(-3, new Uint8Array(y));

        // Encode as CBOR
        return cborEncodeMap(coseKey);
    }

    /**
     * Base64URL to ArrayBuffer
     * @param {string} base64url
     * @returns {ArrayBuffer}
     */
    function base64UrlToArrayBuffer(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const paddingLength = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(paddingLength);
        return base64ToArrayBuffer(padded);
    }

    /**
     * Simple CBOR encoding for Map
     * @param {Map} map
     * @returns {Uint8Array}
     */
    function cborEncodeMap(map) {
        const items = [];

        // Major type 5 (map) + count
        items.push(0xa0 + map.size);

        for (const [key, value] of map.entries()) {
            // Encode key
            items.push(...cborEncodeValue(key));

            // Encode value
            items.push(...cborEncodeValue(value));
        }

        return new Uint8Array(items);
    }

    /**
     * CBOR encode value
     * @param {*} value
     * @returns {Array<number>}
     */
    function cborEncodeValue(value) {
        if (typeof value === 'number') {
            if (value >= 0 && value <= 23) {
                return [value];
            } else if (value < 0 && value >= -24) {
                return [0x20 + (-1 - value)];
            } else if (value >= 0 && value <= 255) {
                return [0x18, value];
            } else if (value < 0 && value >= -256) {
                return [0x38, -1 - value];
            }
        } else if (value instanceof Uint8Array) {
            // Byte string
            const length = value.length;
            // const result = [0x40 + length];
            // result.push(...Array.from(value));
            // return result;
            const result = length < 24
                ? [0x40 + length]
                : [0x58, length];

            result.push(...Array.from(value));
            return result;
        }
        return [0xf6]; // null
    }

    /**
     * Create attestation object in CBOR format
     * @param {Uint8Array} authenticatorData
     * @returns {string}
     */
    function createAttestationObject(authenticatorData) {
        // CBOR Map for attestation object
        const attestationMap = new Map();

        // fmt: "none" (for self-attestation)
        attestationMap.set('fmt', 'none');

        // attStmt: {} (empty map)
        attestationMap.set('attStmt', new Map());

        // authData: authenticatorData
        attestationMap.set('authData', authenticatorData);

        const cbor = cborEncodeAttestationObject(attestationMap);
        return arrayBufferToBase64(cbor.buffer);
    }

    /**
     * CBOR encode attestation object
     * @param {Map} map
     * @returns {Uint8Array}
     */
    function cborEncodeAttestationObject(map) {
        const items = [];

        // Major type 5 (map) with 3 items
        items.push(0xa3);

        // "fmt": "none"
        items.push(0x63); // text string of length 3
        items.push(...Array.from(new TextEncoder().encode('fmt')));
        items.push(0x64); // text string of length 4
        items.push(...Array.from(new TextEncoder().encode('none')));

        // "attStmt": {}
        items.push(0x67); // text string of length 7
        items.push(...Array.from(new TextEncoder().encode('attStmt')));
        items.push(0xa0); // empty map

        // "authData": <bytes>
        items.push(0x68); // text string of length 8
        items.push(...Array.from(new TextEncoder().encode('authData')));

        const authData = map.get('authData');
        // Byte string with length
        if (authData.length < 24) {
            items.push(0x40 + authData.length);
        } else {
            items.push(0x58, authData.length);
        }
        items.push(...Array.from(authData));

        return new Uint8Array(items);
    }

    // Public API
    return {
        createPasskey,
        usePasskey,
        createCredentialForSite,
        arrayBufferToBase64,
        base64ToArrayBuffer
    };
})();

export default PasskeyGenerator;
