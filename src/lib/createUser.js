import axios from 'axios';
// import forge from 'node-forge';
import { encryptPrivateKey, createSafeFromFolder, setPublicKey } from './crypto';
import importXML from './importXML'

/*

// https://stackoverflow.com/questions/41529138/import-pem-keys-using-web-crypto
// https://github.com/digitalbazaar/forge/issues/255

*/

let ticket = null;
let template_safes = null;


const crypto = window.crypto || window.msCrypto;
const subtle = crypto ? (crypto.webkitSubtle || crypto.subtle) : null;

const credentials_to_send = { publicKey: null, encryptedPrivateKey: null };


async function uploadUserData() {

    setPublicKey(credentials_to_send.publicKey);

    const rootSafe = importXML(JSON.parse(template_safes));

    const encryptedSafes = [];
    for (let folder of rootSafe.folders) {
        encryptedSafes.push(await createSafeFromFolder(folder));
    }

    return axios.post('create_user.php',
        {
            publicKey: credentials_to_send.publicKey,
            encryptedPrivateKey: credentials_to_send.encryptedPrivateKey,
            import: encryptedSafes
        }
    )
        .then((reply) => {
            const result = reply.data;
            if (result.status != 'Ok') {
                alert(result.status);
            }
            return result.status;
        })
}

// forge: pkcs8 to PEM

function pkcs82pem(pkcs8_ab) {
    const pkcs8_bytes = new Uint8Array(pkcs8_ab);
    let pkcs8_b64 = btoa(String.fromCharCode.apply(null, pkcs8_bytes));
    let pem = '-----BEGIN PRIVATE KEY-----\n';
    while (pkcs8_b64.length > 0) {
        pem += pkcs8_b64.slice(0, 64) + '\n';
        pkcs8_b64 = pkcs8_b64.slice(64);
    }
    pem += '-----END PRIVATE KEY-----\n';
    return pem;
}

function spki2pem(spkiAb) {
    const spkiBytes = new Uint8Array(spkiAb);
    let spkiB64 = btoa(String.fromCharCode.apply(null, spkiBytes));
    let pem = '-----BEGIN PUBLIC KEY-----\n';
    while (spkiB64.length > 0) {
        pem += spkiB64.slice(0, 64) + '\n';
        spkiB64 = spkiB64.slice(64);
    }
    return pem + '-----END PUBLIC KEY-----\n';
}

function keyPairGenerated(keypair) {
    return subtle.exportKey('pkcs8', keypair.privateKey)
        .then(exportedPrivateKey => {
            const pem = pkcs82pem(exportedPrivateKey);
            return encryptPrivateKey(pem, ticket)
                .then(encryptedPrivateKey => {
                    credentials_to_send.encryptedPrivateKey = encryptedPrivateKey;
                    return Promise.resolve(1);
                });
        })
        .then(() => subtle.exportKey('spki', keypair.publicKey))
        .then(publicKey => {
            credentials_to_send.publicKey = spki2pem(publicKey);
            return Promise.resolve(1);
        })
}

function cryptoapi_catch(err) {
    console.log(err);
    if (window.location.href.includes("debug")) {
        alert(`387: ${err}`);
        return;
    }
    window.location.href = `error_page.php?js=387&error=${err}`;
}

function createUser(data) {

    console.log('createUser called');
    console.log(data);

    ticket = data.ticket;
    template_safes = data.template_safes;

    return subtle.generateKey({
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: 'SHA-1' },
    },
        true,
        ['encrypt', 'decrypt'])
        .then(keyPairGenerated)
        .then(uploadUserData)
        .catch(cryptoapi_catch);
}

export default createUser;
