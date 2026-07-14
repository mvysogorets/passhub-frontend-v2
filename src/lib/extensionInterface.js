// const consoleLog = console.log;
const consoleLog = () => { };

import { getTOTP, getTOTP2 } from "./totp";

const isIOS = navigator.userAgent.match(/iPhone|iPod|iPad/i)
    || (navigator.userAgent.match(/Intel Mac OS X/i) && navigator.maxTouchPoints > 1);

const isAndroid = navigator.userAgent.match(/Android/i) ||
    (navigator.userAgent.match(/Samsung/i) && navigator.userAgent.match(/Linux/i));

const mobileDevice = isIOS || isAndroid;

const chromeExtensionId = 'bamjbfhfacpdkenilcibkmpdahkgfejh';
const devChromeExtensionId = 'mjcejgifimlbgmdckhdlopkjhehombpi';
const edgeExtensionId = 'epmmbjnnghpopnhkilkoomaahpinjpkc';
const devEdgeExtensionId = 'mpclodkiedkokmddfcooapahedfealjj';

const safariExtensionId = "com.wwpass.passhub.Extension (7U4QXAP4SL)";
const devSafariExtensionId = "com.wwpass.PassHub-net.Extension (UNSIGNED)";


let extension;

if (window.navigator.userAgent.match(/ Chrome\//i)) {
    extension = chrome;
} else if (typeof browser != 'undefined') {
    extension = browser;
}

let extensionId = null;


// keep Passhub alive when used by extension
let restartIdleTimer = null;

function setRestartIdleTimer(fn) {
    restartIdleTimer = fn
}

let findRecords = null;

async function sendAdvise(message) {
    consoleLog('sendAdvise');
    consoleLog(message);
    if (message.id === 'find') { // legacy
        message.id = 'advise request';
    }
    if (message.id === 'not a payment page') { // legacy
        message.id = 'advise request';
    }
    if ((message.id === 'advise request') || (message.id === 'payment page')) {
        if (restartIdleTimer) {
            restartIdleTimer();
        }
    }

    const found = await findRecords(message);
    return extension.runtime.sendMessage(extensionId, found)
        .then(response => {
            if (!response) {
                if (extension.runtime.lastError) {
                    consoleLog(extension.runtime.lastError);
                } else {
                    consoleLog('no response');
                }
            } else {
                consoleLog('sendAdvise got response');
                consoleLog(response);
            }
        })
        .catch(err => {
            console.log('catch 48')
        })
};

function sendCTS() {
    if ((typeof extension != 'undefined') && extension.runtime && extension.runtime.sendMessage) {
        extension.runtime.sendMessage(extensionId, { id: "clear to send" })
            .then(response => {
                consoleLog('cts response');
                consoleLog(response);
                if (response) {
                    return sendAdvise(response)
                }
            })
            .catch(err => {
                consoleLog('sendCTS catch');
                consoleLog(err);
            })
    }
}

function sendCredentials(s) {

    let url = s.url;
    if (url.search('://') == -1) {
        url = `https://${url}`;
    }
    s.url = url;

    if (!mobileDevice
        && (typeof extension != 'undefined')
        && extension.runtime
        && extension.runtime.sendMessage) {

        extension.runtime.sendMessage(extensionId, s)
            .then(response => {
                if (!response) {
                    if (extension.runtime.lastError) {
                        consoleLog(extension.runtime.lastError);
                    } else {
                        consoleLog('no response');
                    }

                    window.open(url, "_blank");
                } else {
                    consoleLog(response);
                }
            })
            .catch(err => {
                consoleLog(err)
                window.open(url, "_blank");
            });
    } else {
        window.open(url, "_blank");
    }
};

async function openInExtension(item, url) {
    if (extension) {
        if (url.length > 0) {

            if (item.cleartext.length > 5) {
                const secret = item.cleartext[5];
                if (secret.length > 0) {

                    let six = await getTOTP(secret)
                    sendCredentials({
                        id: 'loginRequest',
                        username: item.cleartext[1],
                        password: item.cleartext[2],
                        totp: six,
                        url,
                    });

                }
            } else {
                return sendCredentials({
                    id: 'loginRequest',
                    username: item.cleartext[1],
                    password: item.cleartext[2],
                    url,
                });
            }
        }
    } else {
        if (url.search('://') == -1) {
            url = `https://${url}`;
        }
        window.open(url, "_blank");
    }
}

function listenToExtensionWakeup() {
    window.addEventListener("message", (event) => {
        if (("data" in event) && (typeof event.data.source === 'string') && (event.data.source.startsWith("react-devtools-"))) {
            //    consoleLog(`--got ${event.data.source}--`);
            return;
        }

        consoleLog('got message');
        consoleLog(event);

        if (event.origin !== window.location.origin) {
            if (wrongOrigin < 5) {
                // report warning to the server, however harmless in our case
                serverLog(`extension message orign ${event.origin}`)
                wrongOrigin++;
            }
            consoleLog(`extension message origin ${event.origin}`);
            return;
        }
        consoleLog('window');
        consoleLog(window);
        if (event.source === window) {
            consoleLog("proper source");
            sendCTS();
        } else {
            consoleLog("wrong source");
        }
    })

    document.addEventListener("rts", (event) => {
        consoleLog('got rts event, sending CTS')
        sendCTS();
    })
}


function connect(findCb) {  // legacy interface, use cb only
    findRecords = findCb;
}

function InitiateExtensionConnection() {

    if (!mobileDevice
        && (typeof extension != 'undefined')
        && extension.runtime
        && extension.runtime.sendMessage) {

        // extension.runtime is only defined if there are extensions with passhub as externally connectible


        let extensionIds = []
        if (window.navigator.userAgent.match(/Chrome\//i)) {
            extensionIds = [edgeExtensionId, devEdgeExtensionId, chromeExtensionId, devChromeExtensionId]
        } else if (window.navigator.userAgent.match(/Safari\//i)) { //safari
            extensionIds = [safariExtensionId, devSafariExtensionId];
        } else {
            return;
        }

        const message = { id: "remember me", version: 2 };
        const promises = [];

        for (const extId of extensionIds) {
            promises.push(extension.runtime.sendMessage(extId, message));
        }
        Promise.allSettled(promises).then(values => {
            consoleLog('promiseAll returns');
            consoleLog(values);

            for (let i = 0; i < extensionIds.length; i++) {
                if (values[i].status == "fulfilled") {
                    extensionId = extensionIds[i];
                    consoleLog(`extension ${extensionId} found`);

                    if (values[i].value) {
                        consoleLog('remember-me got response');
                        consoleLog(values[i].value);
                        listenToExtensionWakeup();
                        return;
                    }
                    if (extension.runtime.lastError) {
                        consoleLog('extension.runtime.lastError');
                        consoleLog(extension.runtime.lastError);
                    } else {
                        consoleLog('no response');
                    }
                }
            }
            consoleLog("Error: (installed) passhub.net extension not detected");
        })
    } else {
        consoleLog("Passhub extension not installed");

    }
}


InitiateExtensionConnection();

export { connect, openInExtension, setRestartIdleTimer, InitiateExtensionConnection }

