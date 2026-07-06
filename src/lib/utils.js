import axios from "axios";
import { updateTicket } from 'wwpass-frontend';

function keepTicketAlive(ttl, age) {
  //   console.log('keepTicketAlive called');
  const maxTicketAge = ttl / 2 + 30;
  let ticketTimeStamp = new Date() / 1000 - age;
  let intervalID;

  function CheckIdleTime() {
    const secondsNow = new Date() / 1000;
    if ((secondsNow - ticketTimeStamp) > maxTicketAge) {
      ticketTimeStamp = new Date() / 1000;
      updateTicket('update_ticket.php')
        .catch((error) => {
          console.log('updateticket error');
          console.log(error);
          clearInterval(intervalID);
          window.location = 'logout.php';
        })
    }
  }
  intervalID = window.setInterval(CheckIdleTime, 1000);
}

function serverLogPromise(msg) {
  const data = {
    verifier: getVerifier(),
    msg
  };

  return axios.post(`${getApiUrl()}serverlog.php`, data);
}


function serverLog(msg) {
  const data = {
    verifier: getVerifier(),
    msg
  };

  axios
    .post(`${getApiUrl()}serverlog.php`, data)
    .then(reply => {
      // do nothig, one way  
    })
    .catch(err => {
      // do nothig, one way  
    })
}



//https://en.wikipedia.org/wiki/List_of_the_most_common_passwords
const frequentPasswords = [
  "01234567890-=",
  "123123321",
  "0000000000",
  "1111111111",
  "5555555555",
  "6666666666",
  "6969696969",
  "7777777777",
  "8888888888",
  "09876543210",
  "123qwe",
  "1qaz2wsx3edc",
  "1q2w3e4r5t",
  "aa123456789",
  "aaron431",
  "admin1",
  "administrator",
  "access",
  "ashley",
  "asdfghjkl;'",
  "azerty",
  "baseball",
  "bailey",
  "batman",
  "abc123",
  "charlie",
  "donald",
  "dragon",
  "flower",
  "football",
  "freedom",
  "google",
  "iloveyou",
  "letmein",
  "loveme",
  "lovely",
  "master",
  "million2",
  "monkey",
  "mustang",
  "mynoob",
  "password1!",
  "passw0rd",
  "picture1",
  "princess",
  "qazwsxedc",
  "qqww1122",
  "qwerty123",
  "qwertyuiop[]\\",
  "shadow",
  "starwars",
  "sunshine",
  "superman",
  "trustno1",
  "welcome",
  "whatever",
  "zaq1zaq1",
  "zxcvbnm,./",
  "!@#$%^&*()_+"
];

function isStrongPassword(pwi) {

  const pw = pwi.replace(/\s+/g, ' ');
  const lpw = pw.toLowerCase();

  if (pw.length < 6) {
    return { strongPassword: false, reason: "too short" };
  }
  for (const p of frequentPasswords) {
    if (p.indexOf(lpw) !== -1) {
      return { strongPassword: false, reason: "blacklisted" };
    }
  }
  if (pw.length < 8) {
    return { strongPassword: false, reason: "too short" };
  }
  return { strongPassword: true, reason: "" };
}

function baseName(path) {
  // var base = new String(path).substring(path.lastIndexOf('/') + 1);
  let base = path.substring(path.lastIndexOf('/') + 1);
  if (base.lastIndexOf(".") !== -1) {
    base = base.substring(0, base.lastIndexOf("."));
  }
  return base;
}

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function getFolderById(folderList, id) {
  for (const folder of folderList) {
    if (folder.id === id) {
      return folder;
    }
    const f = getFolderById(folder.folders, id);
    if (f) {
      return f;
    }
  }
  return null;
}


const humanReadableFileSize = (size) => {
  if (size == 0) return "0";
  if (size < 1024) return `${size} B`;
  const i = Math.floor(Math.log(size) / Math.log(1024));
  let num = (size / Math.pow(1024, i));
  const round = Math.round(num);
  num = round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round
  return `${num} ${'KMGTPEZY'[i - 1]}B`;
};

const isMobile = () => {
  const isIOS = navigator.userAgent.match(/iPhone|iPod|iPad/i)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // crazy ios13 on iPad..

  const mobileDevice = isIOS || navigator.userAgent.match(/Android/i);
  return mobileDevice;
}

function lastModified(item) {

  let date;
  if ((typeof item != "undefined") && ('contentModificationDate' in item)) {
    date = new Date(item.contentModificationDate);
  } else if ((typeof item != "undefined") && ('lastModified' in item)) {
    date = new Date(item.lastModified);
  }

  if (date) {

    return date.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return '';
}

// https://www.programiz.com/javascript/examples/first-letter-uppercase

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

let apiUrl = './';
let wsUrl = '';


function getApiUrl() {
  return apiUrl;
}

function setApiUrl(newBase) {
  apiUrl = newBase;
}

function setWsUrl(url) {
  wsUrl = url;
}

function getWsUrl() {
  return wsUrl;
}

function getHostname() {
  let serverUrlObject;
  try {
    serverUrlObject = new URL(apiUrl);
  } catch (err) {
    serverUrlObject = new URL(window.location.href);
  }
  return serverUrlObject.hostname;
}

let csrfToken = '';

function setCsrfToken(token) {
  csrfToken = token;
}

function getVerifier() {
  if (csrfToken.length > 0) {
    return csrfToken;
  }
  return document.getElementById("csrf").getAttribute("data-csrf");
}

let account = {}

function setUserData(a) {
  account = a;
}

function getUserData() {
  return account;
}

function totalRecords() {
  let result = 0;
  for (let s of account.safes) {
    result += s.rawItems.length; // safe.items already normalized 
  }
  return result;
}

function atRecordsLimits() {
  if (isNaN(account.maxRecords)) {
    return false;
  }
  return totalRecords() >= account.maxRecords;
}

function totalStorage() {
  let result = 0;
  for (let s of account.safes) {
    for (let item of s.rawItems) {
      if ("file" in item) {
        result += item.file.size;
      }
    }
  }
  return result;
}

function atStorageLimits() {
  if (isNaN(account.maxStorage)) {
    return false;
  }
  const s = totalStorage();
  return s >= account.maxStorage;
}


let pasteTimestamp = 0
const setPasteTimestamp = (ts) => { pasteTimestamp = ts; }

let pasteEnabled = false;
const PASTE_ENABLED_TIMEOUT = 30;

function isPasteEnabled() {
  const now = new Date() / 1000;
  //  console.log('isPasteEnabled');
  //  console.log(now - pasteTimestamp);
  if (now - pasteTimestamp < PASTE_ENABLED_TIMEOUT) {
    return true;
  }
  return false;
}

function enablePaste(status) {
  if (!status) {
    setPasteTimestamp(0);
  }
  pasteEnabled = status;
}


/*
function enablePaste(status) {
  pasteEnabled = status;
}

function isPasteEnabled(status) {
  return pasteEnabled;
}

*/

function isPasswordItem(item) {
  return !item.note && !item.file && item.version !== 5 && item.version !== 6;
}

function isPasskeyItem(item) {
  return item.version === 6 && item.type === "passkey";
}

function isFileItem(item) {
  return item.file ? true : false;
}

function isBankCardItem(item) {
  return item.version === 5 && item.cleartext[0] === "card";
}

function isNoteItem(item) {
  return item.note ? true : false;
}


const limits = { MAX_TITLE_LENGTH: 50, MAX_NOTE_LENGTH: 10000, MAX_USERNAME_LENGTH: 100, MAX_PASSWORD_LENGTH: 100, MAX_URL_LENGTH: 2048, MAX_TOTP_LENGTH: 2048 };

export {
  serverLog,
  serverLogPromise,
  isStrongPassword,
  keepTicketAlive,
  baseName,
  escapeHtml,
  getFolderById,
  humanReadableFileSize,
  isMobile,
  lastModified,
  capitalizeFirstLetter,
  getApiUrl,
  setApiUrl,
  getWsUrl,
  setWsUrl,
  getHostname,
  setCsrfToken,
  getVerifier,
  // setUserData,
  // getUserData,
  limits,
  atRecordsLimits,
  atStorageLimits,
  totalRecords,
  totalStorage,

  enablePaste,
  setPasteTimestamp,
  isPasteEnabled,

  isPasswordItem,
  isFileItem,
  isBankCardItem,
  isPasskeyItem,
  isNoteItem,

};
