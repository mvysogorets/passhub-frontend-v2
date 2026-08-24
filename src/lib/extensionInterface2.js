const consoleLog = console.log;
// const consoleLog = () => {};


const isIOS = navigator.userAgent.match(/iPhone|iPod|iPad/i)
    || (navigator.userAgent.match(/Intel Mac OS X/i) && navigator.maxTouchPoints > 1);

const isAndroid = navigator.userAgent.match(/Android/i) ||
    (navigator.userAgent.match(/Samsung/i) && navigator.userAgent.match(/Linux/i));

const mobileDevice = isIOS || isAndroid;

const chromeExtensionId = 'bamjbfhfacpdkenilcibkmpdahkgfejh';
const devChromeExtensionId = 'mjcejgifimlbgmdckhdlopkjhehombpi';
const edgeExtensionId = 'epmmbjnnghpopnhkilkoomaahpinjpkc';
const devEdgeExtensionId = 'mpclodkiedkokmddfcooapahedfealjj';

const safarExtensionId = "com.wwpass.PassHub-net.Extension";
const devSafarExtensionId = "com.wwpass.PassHub-net.Extension (UNSIGNED)";


let extension;

if (window.navigator.userAgent.match(/ Chrome\//i)) {
    extension = chrome;
} else if (typeof browser != 'undefined') {
    extension = browser;
}

let extensionId = chromeExtensionId;

let restartIdleTimer = null;

function setRestartIdleTimer(fn) {
    restartIdleTimer = fn
}

let findRecords = null;

function sendAdvise(message) {
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
    return extension.runtime.sendMessage(extensionId, findRecords(message))
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
                return sendAdvise(response)
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

function openInExtension(item, url) {
    if (url.length > 0) {
        sendCredentials({
            id: 'loginRequest',
            username: item.cleartext[1],
            password: item.cleartext[2],
            url,
        });
    }
}

function listenToExtensionWakeup() {
    window.addEventListener("message", (event) => {
        if (("data" in event) && (typeof event.data.source === 'string') && (event.data.source.startsWith("react-devtools-"))) {
            consoleLog(`--got ${event.data.source}--`);
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
}

//------ legacy permanent connection code

let extensionPort = null;

let keepAliveTimer = null;

function logtime() {
    const today = new Date();
    return today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds() + " ";
}

function keepAlive() {
    if (extensionPort && keepAliveTimer) {
        try {
            extensionPort.postMessage({ id: "keepAlive" });
            consoleLog(logtime() + ' keepAlive Sent');
            return;
        }
        catch (err) {
            consoleLog(logtime() + ' catch 51');

            if (keepAliveTimer) {
                clearInterval(keepAliveTimer);
                keepAliveTimer = null;
            }
        }
    }
    if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
    }
}

function legacyConnect(findCb) {
    console.log('legacyConnect called');
    if (typeof extension == 'undefined') {
        return;
    }

    try {
        if (extensionPort) {
            extensionPort.disconnect();
            extensionPort = null
        }

        extensionPort = extension.runtime.connect(extensionId);
        consoleLog(logtime() + ' connected');


        keepAliveTimer = setInterval(keepAlive, 25000);

        //remove in manifest V3: 

        setTimeout(connect, 4 * 60 * 1000, findCb);

        extensionPort.onDisconnect.addListener((p) => {
            // FF way:
            /*if (p.error) {
                consoleLog(`Disconnected due to an error: ${p.error.message}`);
            }*/
            extensionPort = null;

            consoleLog(logtime() + ' disConnected');

            if (extension.runtime.lastError) {  // does not exist
                consoleLog('Connection rintime.error');
                consoleLog(extension.runtime.lastError);
            } else {
                setTimeout(legacyConnect, 100, findCb);
            }

        });
        extensionPort.onMessage.addListener(function (message, sender) {

            consoleLog('received');
            consoleLog(message);
            sendAdvise(message)
                .catch(err => {
                    consoleLog('extensionport listener catch');
                    consoleLog(err);
                })

        });
    } catch (err) {
        consoleLog(err)
    }
};

//------ end legacy permanent connection code


function connect(findCb) {  // legacy interface, use cb only
    findRecords = findCb;
}


function logExtensionId() {


    switch (extensionId) {
        case devChromeExtensionId:
            consoleLog("devChromeExtensionId");
            break;

        case chromeExtensionId:
            consoleLog("chromeExtensionId");
            break

        case devEdgeExtensionId:
            consoleLog("devEdgeExtensionId");
            break;

        case edgeExtensionId:
            consoleLog("edgeExtensionId");
            break

        case devSafarExtensionId:
            consoleLog("devSafarExtensionId");
            break;

        case safarExtensionId:
            consoleLog("safarExtensionId");
            break

        default:
            consoleLog("illegal extensionId", extensionId);
            break;
    }
}


if (!mobileDevice
    && (typeof extension != 'undefined')
    && extension.runtime
    && extension.runtime.sendMessage) {


    let ids = []

    if (window.navigator.userAgent.match(/ Chrome\//i)) {

        if (window.location.href.includes("extension")) {
            ids.push(devChromeExtensionId);
            if (window.navigator.userAgent.match(/ Edg\//i)) {
                ids.push(devEdgeExtensionId);
            }
        } else {
            ids.push(chromeExtensionId);
            if (window.navigator.userAgent.match(/ Edg\//i)) {
                ids.push(edgeExtensionId);
            }
        }
    } else {
        ids.push(devSafarExtensionId);
    }

    extensionId = ids.pop();
    extension.runtime.sendMessage(extensionId, { id: "remember me" })
        .then(response => {
            if (response) {
                // extension found
                consoleLog(response);
                logExtensionId();
                if (response.id == "Ok") {
                    listenToExtensionWakeup();
                } else { // try legacy permanent connection
                    legacyConnect();
                }
            } else {
                consoleLog('255 should not happen');
            }
        })
        .catch(err => {

            if (!ids.length) {
                consoleLog('catch extensionInterface 261');
                consoleLog(err);
                return;
            }
            extensionId = ids.pop();
            extension.runtime.sendMessage(extensionId, { id: "remember me" })
                .then(response => {
                    if (response) {
                        // extension found
                        consoleLog(response);
                        logExtensionId();
                        if (response.id == "Ok") {
                            listenToExtensionWakeup();
                        } else { // try legacy permanent connection
                            legacyConnect();
                        }
                    } else {
                        consoleLog('285 should not happen');
                    }
                })
                .catch(err1 => {
                    consoleLog('catch extensionInterface 282');
                    consoleLog(err1);
                })
        })
} else {
    consoleLog("no passhub.net extension installed");
}
export { connect, openInExtension, setRestartIdleTimer }
