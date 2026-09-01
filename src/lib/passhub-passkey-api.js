/**
 * passhub-passkey-api.js
 * 
 * Bridge between the extension and the PassHub React application.
 * 
 * @copyright 2026 WWPass
 * @license MIT
 */

import PasskeyGenerator from './passkey-generator.js';

(function () {
    'use strict';

    // Check dependencies.
    if (typeof PasskeyGenerator === 'undefined') {
        console.error('PassHubPasskeyAPI: PasskeyGenerator not loaded');
        return;
    }

    /**
    * API for working with passkeys.
     */
    const PassHubPasskeyAPI = {
        /**
 * Create a new passkey.
 * 
 * @param {Object} options - Creation parameters
 * @param {string} options.rpId - Relying Party ID (site domain)
 * @param {string} options.userName - User name
 * @param {string} options.userDisplayName - Display name
 * @param {string} options.siteName - Optional site name
 * @param {Function} options.encryptFn - Optional encryption function
 * @returns {Promise<Object>} Created passkey
 */
        async createPasskey(options) {
            try {
                const result = await savePasskeyInReact(options);
                return result.passkey;

            } catch (error) {
                console.error('Error creating passkey:', error);
                throw error;
            }
        },

        /**
         * Get the safe list.
         * 
         * @returns {Promise<Array>} User safe list
         */
        async getSafeList() {
            try {
                // Use the existing global PassHub object.
                if (window.PassHub && window.PassHub.getSafeList) {
                    return window.PassHub.getSafeList();
                }

                // Otherwise, retrieve it through the API.
                console.warn('PassHub.getSafeList not available, returning empty array');
                return [];

            } catch (error) {
                console.error('Error getting safe list:', error);
                throw error;
            }
        }
    };

    function savePasskeyInReact(options) {
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID();
            const timeoutId = window.setTimeout(() => {
                window.removeEventListener('message', responseHandler);
                reject(new Error('Passkey save timed out'));
            }, 55000);

            const responseHandler = (event) => {
                if (event.source !== window || event.origin !== window.location.origin) return;
                if (event.data?.type !== 'passhub-react-save-passkey-response') return;
                if (event.data.requestId !== requestId) return;

                window.clearTimeout(timeoutId);
                window.removeEventListener('message', responseHandler);
                const result = event.data.result;
                if (result?.success) {
                    resolve(result);
                } else {
                    reject(new Error(result?.error || 'Passkey was not saved'));
                }
            };

            window.addEventListener('message', responseHandler);
            window.postMessage({
                type: 'passhub-react-save-passkey-request',
                requestId,
                options
            }, window.location.origin);
        });
    }

    function resolvePasskeyInReact(allowCredentialIds, requestData) {
        return new Promise((resolve, reject) => {
            const requestId = crypto.randomUUID();
            const timeoutId = window.setTimeout(() => {
                window.removeEventListener('message', responseHandler);
                reject(new Error('Passkey unlock timed out'));
            }, 55000);

            const responseHandler = (event) => {
                if (event.source !== window || event.origin !== window.location.origin) return;
                if (event.data?.type !== 'passhub-react-resolve-passkey-response') return;
                if (event.data.requestId !== requestId) return;

                window.clearTimeout(timeoutId);
                window.removeEventListener('message', responseHandler);
                const result = event.data.result;
                if (result?.success) {
                    resolve(result);
                } else {
                    reject(new Error(result?.error || 'Passkey could not be opened'));
                }
            };

            window.addEventListener('message', responseHandler);
            window.postMessage({
                type: 'passhub-react-resolve-passkey-request',
                requestId,
                allowCredentialIds,
                challenge: requestData.challenge,
                origin: requestData.origin,
                rpId: requestData.rpId,
                userVerification: requestData.userVerification
            }, window.location.origin);
        });
    }

    /**
    * Convert a PassHub passkey to WebAuthn credential format.
    * @param {Object} passkeyData - PassHub passkey object
    * @param {Object} originalOptions - Original publicKey options
     * @returns {Object} WebAuthn credential
    
        * Not used because PasskeyGenerator.createCredentialForSite is now used instead.
    */
    function convertToWebAuthnCredential(passkeyData, originalOptions) {
        const { passkey } = passkeyData;

        // Decode base64 strings to ArrayBuffers
        const credentialIdBuffer = base64ToArrayBuffer(passkey.credentialId);
        const publicKeyJwk = JSON.parse(passkey.publicKey);

        // Build attestation object (simplified for now)
        const attestationObject = {
            fmt: 'none',
            authData: new Uint8Array(37), // Minimal authData
            attStmt: {}
        };

        // Build client data JSON
        const clientData = {
            type: 'webauthn.create',
            challenge: originalOptions?.challenge || '',
            origin: window.location.origin
        };

        return {
            id: passkey.credentialId,
            rawId: credentialIdBuffer,
            response: {
                clientDataJSON: new TextEncoder().encode(JSON.stringify(clientData)),
                attestationObject: new TextEncoder().encode(JSON.stringify(attestationObject))
            },
            type: 'public-key'
        };
    }

    /**
     * Convert base64 to ArrayBuffer
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

    // Extension bridge: listen for requests through window messages.
    window.addEventListener('message', async (event) => {
        if (event.source !== window || event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== 'passhub-passkey-request') return;

        const { requestId, id, data } = event.data;
        let result;

        try {
            if (id === 'passkey-create-request') {
                // Create a new passkey.
                console.log('Creating passkey for:', data.rpId);

                const passkeyData = await PassHubPasskeyAPI.createPasskey({
                    rpId: data.rpId,
                    userName: data.userName,
                    userDisplayName: data.userDisplayName,
                    userHandle: data.userHandle,
                    siteName: data.rpName || data.rpId
                });

                console.log('Passkey created, converting to WebAuthn format');

                // Convert to WebAuthn credential format.
                // result = {
                //     credential: convertToWebAuthnCredential(passkeyData, data)
                // };
                const credential = await PasskeyGenerator.createCredentialForSite(
                    passkeyData.passkey,
                    {
                        challenge: data.challenge,
                        origin: data.origin
                    }
                );

                result = { credential };

                console.log('Credential converted, sending response');
                console.log('Dispatching passkey-response event with data:', result);

            } else if (id === 'passkey-get-request') {
                const resolved = await resolvePasskeyInReact(
                    (data.allowCredentials || []).map(credential => credential.id),
                    data
                );
                result = { assertion: resolved.assertion };

                console.log('Passkey assertion created, sending response');
            }

            // Send the response back to the extension through the bridge.
            window.postMessage({
                type: 'passhub-passkey-response',
                requestId,
                result
            }, '*');
            console.log('passkey-response sent via postMessage');

        } catch (error) {
            console.error('Error handling passkey request:', error);
            // Send the error through window.postMessage.
            window.postMessage({
                type: 'passhub-passkey-response',
                requestId,
                result: {
                    error: error.message
                }
            }, '*');
        }
    });

    document.documentElement.dataset.passhubPasskeyApi = 'ready';
    console.log('Extension bridge listener registered');

})();
