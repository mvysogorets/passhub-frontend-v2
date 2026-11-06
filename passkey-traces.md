1.    credentials.create({passkey: options})

```json
{
    "challenge": {/*ArryaBuffer 32 bytes)*/}, 
    "rp": {
        "name": "Passkey Test Server",
        "id": "localhost"
    },
    "user": {
        "id": {/*ArrayBuffer 16 bytes*/},
        "name": "user_083619ab",
        "displayName": "user_083619ab"
    },
    "pubKeyCredParams": [
        {
            "type": "public-key",
            "alg": -7
        },
        {
            "type": "public-key",
            "alg": -257
        }
    ],
    "timeout": 60000,
    "excludeCredentials": [],
    "attestation": "none",
    "authenticatorSelection": {
        "residentKey": "preferred",
        "requireResidentKey": false,
        "userVerification": "preferred"
    }
}
```

2. response:
```Json
{
    "authenticatorAttachment": null,
    "id": "0Dw2Cz4cYzkI6BHCSLjMUw", /* base64url encoded rawId */
    "rawId": {/* ArrayBuffer 16 bytes*/},
    "type": "public-key",
    "authenticatorAttachment": null,
    "response": {
        "clientDataJSON": {/*ArrayBuffer  137 bytes*/},
        "attestationObject": {/* ArrayBuffer 178 bytes*/}
    }
}
```

clientDataJSON decoded

{
    "type": "webauthn.create",
    "challenge": "Sp_qDLo4dTUXXpmdUXDyboks0pZK9auq0EZrtdoM6FE",
    "origin": "http://localhost:8000",
    "crossOrigin": false
}

"attestationObject"

{
    "fmt": "none",
    "attStmt": {},
    "authData": {
        "rpIdHash": "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d9763",
        "flags": {
            "raw": 69,
            "userPresent": true,
            "userVerified": true,
            "backupEligible": false,
            "backupState": false,
            "attestedCredentialData": true,
            "extensionData": false
        },
        "signCount": 0,
        "aaguid": "00000000000000000000000000000000",
        "credentialId": "bc8bc2553ca2cafd81f36cc1c587390f",
        "credentialPublicKey": {
            "1": 2,
            "3": -7,
            "-1": 1,
            "-2": {
                "0": 208,
                "1": 223,
                "2": 25,
                "3": 84,
                "4": 251,
                "5": 28,
                "6": 74,
                "7": 192,
                "8": 123,
                "9": 36,
                "10": 178,
                "11": 195,
                "12": 94,
                "13": 20,
                "14": 20,
                "15": 176,
                "16": 24,
                "17": 7,
                "18": 241,
                "19": 228,
                "20": 80,
                "21": 235,
                "22": 134,
                "23": 244,
                "24": 168,
                "25": 134,
                "26": 82,
                "27": 4,
                "28": 67,
                "29": 243,
                "30": 66,
                "31": 246
            },
            "-3": {
                "0": 230,
                "1": 169,
                "2": 143,
                "3": 224,
                "4": 59,
                "5": 185,
                "6": 89,
                "7": 241,
                "8": 130,
                "9": 58,
                "10": 22,
                "11": 170,
                "12": 7,
                "13": 93,
                "14": 209,
                "15": 154,
                "16": 103,
                "17": 195,
                "18": 141,
                "19": 139,
                "20": 2,
                "21": 194,
                "22": 69,
                "23": 17,
                "24": 253,
                "25": 133,
                "26": 190,
                "27": 211,
                "28": 40,
                "29": 253,
                "30": 79,
                "31": 222
            }
        }
    }
}


3. credentials.get 
```json
{
    "publicKey": {
        "challenge": {/* ArrayBuffer 32 bytes */},
        "rpId": "localhost",
        "timeout": 60000,
        "userVerification": "preferred",
        "allowCredentials": [
            {
                "type": "public-key",
                "id": {/* ArrayBuffer 16 bytes */}
            },
            {
                "type": "public-key",
                "id": {/* ArrayBuffer 32 bytes */}
            },
/*            ...... */
        ]
    }
}
```

4. Answer to credentials.get

```json
{
    "id": "0Dw2Cz4cYzkI6BHCSLjMUw",
    "rawId": {/* ArrayBuffer 16 bytes */},
    "response": {
        "clientDataJSON": {/* ArrayBuffer 134 bytes */,
        "authenticatorData": {/* ArrayBuffer 37 bytes */},
        "signature": {/* ArrayBuffer 71 bytes */},
        "userHandle": null
    },
    "authenticatorAttachment": null,
    "clientExtensionResults": {},
    "type": "public-key"
}
```