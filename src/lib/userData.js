import axios from "axios";

import * as passhubCrypto from "../lib/crypto";

import {
  getFolderById,
  getApiUrl,
  getWsUrl,
  getVerifier,
  serverLog
} from "../lib/utils";

import mockData from "../lib/mockdata";

import createUser from "../lib/createUser";

let userData = {};
let accountData = {};

let cmtData = {}; // copy-move toast operation parameters 

function setCmtData(data) {
  cmtdata = data;
}

function getCmtData(data) {
  return cmtdata;
}

function getUserData() {
  return userData;
}

function getAccountData() {
  return accountData;
}

function setGeneratorConfig(generator) {
  userData.generator = generator;
}


function updateEmail(newMail) {
  userData['email'] = newMail;
  accountData['email'] = newMail;
}

function clearAutorenew(newData) {
  delete userData['autorenew'];
  delete accountData['autorenew'];
}

function updateInactivityTimeout(newTimeout) {
  userData['desktop_inactivity'] = newTimeout;
  userData['idleTimeout'] = newTimeout;
  accountData['desktop_inactivity'] = newTimeout;
  accountData['idleTimeout'] = newTimeout;
}

function decryptSafeData(safe, aesKey) {
  for (const item of safe.items) {
    //    item.cleartext = passhubCrypto.decodeItem(item, aesKey);
    passhubCrypto.decodeItem(item, aesKey);
  }

  for (const folder of safe.folders) {
    folder.cleartext = passhubCrypto.decodeFolder(folder, aesKey);
  }
}

function decryptGroups(eGroups) {
  if (!eGroups) {
    return Promise.resolve([]);
  }
  const promises = eGroups.map((group) =>
    passhubCrypto.decryptAesKey(group.encrypted_key_CSE).then((bstringKey) => {
      group.bstringKey = bstringKey;
      group.name = passhubCrypto.decryptSafeName(group, group.bstringKey);
      return group;
    }
    ));
  return Promise.all(promises);
}

function decryptSafes(eSafes) {

  const promises = eSafes.map((safe) => {
    if (!safe.bstringKey) {
      return passhubCrypto.decryptAesKey(safe.key).then((bstringKey) => {
        safe.bstringKey = bstringKey;
        safe.name = passhubCrypto.decryptSafeName(safe, safe.bstringKey);
        return decryptSafeData(safe, safe.bstringKey);
      })
    } else {
      return Promise.resolve(0).then(() => {
        safe.name = passhubCrypto.decryptSafeName(safe, safe.bstringKey);
        return decryptSafeData(safe, safe.bstringKey);
      })
    }
  });
  return Promise.all(promises);
}

function normalizeFolder(folder, items, folders) {
  folder.contentModificationDate = folder.lastModified
    ? folder.lastModified
    : "-";
  folder.name = folder.cleartext[0];
  folder.id = folder._id;
  folder.path = [...folder.path, [folder.cleartext[0], folder.id]];

  folder.items = [];
  for (const item of items) {
    if (item.folder === folder.id) {
      folder.items.push(item);
      item.path = folder.path;
      if (
        item.lastModified &&
        item.lastModified > folder.contentModificationDate
      ) {
        folder.contentModificationDate = item.lastModified;
      }
    }
  }
  folder.items.sort((a, b) =>
    a.cleartext[0].toLowerCase().localeCompare(b.cleartext[0].toLowerCase())
  );

  folder.folders = [];
  for (const f of folders) {
    if (f.parent === folder.id) {
      folder.folders.push(f);
      f.path = folder.path;
      f.safe = folder.safe;
      normalizeFolder(f, items, folders);
      if (
        f.contentModificationDate &&
        f.contentModificationDate > folder.contentModificationDate
      ) {
        folder.contentModificationDate = f.contentModificationDate;
      }
    }
  }
  folder.folders.sort((a, b) =>
    a.cleartext[0].toLowerCase().localeCompare(b.cleartext[0].toLowerCase())
  );
}

function normalizeSafes(safes) {
  for (const safe of safes) {
    safe.rawItems = safe.items;
    safe.path = [[safe.name, safe.id]];
    safe.items = [];
    for (const item of safe.rawItems) {
      if (!item.folder || item.folder == "0") {
        safe.items.push(item);
        item.path = safe.path;
      }
    }
    safe.items.sort((a, b) =>
      a.cleartext[0].toLowerCase().localeCompare(b.cleartext[0].toLowerCase())
    );

    safe.rawFolders = safe.folders;
    safe.folders = [];
    for (const folder of safe.rawFolders) {
      if (!folder.parent || folder.parent == "0") {
        safe.folders.push(folder);
        folder.path = safe.path;
        folder.safe = safe;
        normalizeFolder(folder, safe.rawItems, safe.rawFolders);
      }
    }
    safe.folders.sort((a, b) =>
      a.cleartext[0].toLowerCase().localeCompare(b.cleartext[0].toLowerCase())
    );
  }
}

function _decryptUserData1(data) {
  let startTime = new Date().getTime();
  return passhubCrypto.getPrivateKey(data)
    .then((k) => decryptGroups(data.groups))
    .then((groups) => {
      for (let safe of data.safes) {
        if (safe.group) {
          for (let group of groups) {
            if (safe.group == group.GroupID) {
              safe.bstringKey = passhubCrypto.decryptSafeKey(safe.key, group.bstringKey);
              break;
            }
          }
        }
      }
      return decryptSafes(data.safes)
    })
    .then((safes) => {

      let decryptTime = new Date().getTime();
      data.safes.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      normalizeSafes(data.safes);
      data.activeFolder = getFolderById(data.safes, data.currentSafe);
      if (!data.activeFolder) {
        data.activeFolder = data.safes[0];
      }
      userData = data;
      let totalRecords = 0;
      let totalStorage = 0;
      for (const safe of data.safes) {
        totalRecords += safe.items.length;
        for (const item of safe.items) {
          if ('file' in item) {
            totalStorage += item.file.size;
          }
        }
      }

      accountData = {
        email: data.email,
        maxRecords: data.maxRecords,
        maxStorage: data.maxStorage,
        maxFileSize: data.maxFileSize,
        upgrade: data.upgrade,
        business: data.business,
        plan: data.plan,
        expires: data.expires,
        autorenew: data.autorenew,
        receipt_url: data.receipt_url,
        totalRecords,
        totalStorage,
        idleTimeout: data.idleTimeout,
        desktop_inactivity: data.desktop_inactivity
      }

      data.totalRecords = totalRecords;
      data.totalStorage = totalStorage;
      if (window.location.href.includes("except")) {
        throw new Error('downloadUserData');
      }
      return data;
    })

}


// const downloadUserData = () => {
async function downloadUserData() {


  if (window.location.href.includes("mock") || window.location.href.includes("localhost")) {
    mockData.activeFolder = mockData.safes[0];
    mockData.safes[0].folders[0].safe = mockData.safes[0];
    mockData.safes[1].folders[0].safe = mockData.safes[1];
    normalizeSafes(mockData.safes);
    //    return Promise.resolve(mockData);
    return mockData;
  }

  let startTime = new Date().getTime();

  let result = await axios.post(`${getApiUrl()}get_user_datar.php`, {
    verifier: getVerifier(),
  })

  if (result.data.status === "login") {
    window.location.href = "expired.php";
    progress.unlock();
    return false;
  }
  if (result.data.status === "not found") {
    result = await createUser(result.data);


    result = await axios.post(`${getApiUrl()}get_user_datar.php`, {
      verifier: getVerifier(),
    })

  }

  if (result.data.status === "Ok") {
    let endTime = new Date().getTime();

    const data = result.data.data;
    const r = await _decryptUserData1(data);
    return r;
  }

  /*
      })
      .catch((error) => {
        progress.unlock();
        console.log('cauth 185', error);
      });
  */
};

export {
  downloadUserData,
  getUserData,
  getAccountData,
  updateEmail,
  updateInactivityTimeout,
  clearAutorenew,

  decryptGroups, //to be removed: usermanagement may use all user data
  // setCmtData,
  // getCmtData
  setGeneratorConfig
};


/*
        return passhubCrypto.getPrivateKey(data)
          .then((k) => decryptGroups(data.groups))
          .then((groups) => {
            for (let safe of data.safes) {
              if (safe.group) {
                for (let group of groups) {
                  if (safe.group == group.GroupID) {
                    safe.bstringKey = passhubCrypto.decryptSafeKey(safe.key, group.bstringKey);
                    break;
                  }
                }
              }
            }
            return decryptSafes(data.safes)
          })
          .then((safes) => {
            // console.log('safes decrypted', safes);
 
            let decryptTime = new Date().getTime();
            console.log('decrypt time', decryptTime - endTime);
            data.safes.sort((a, b) =>
              a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            );
            normalizeSafes(data.safes);
            data.activeFolder = getFolderById(data.safes, data.currentSafe);
            if (!data.activeFolder) {
              console.log("active folder not found" + data.currentSafe);
              data.activeFolder = data.safes[0];
            }
            userData = data;
            let totalRecords = 0;
            let totalStorage = 0;
            for (const safe of data.safes) {
              totalRecords += safe.items.length;
              for (const item of safe.items) {
                if ('file' in item) {
                  totalStorage += item.file.size;
                }
              }
            }
 
            accountData = {
              email: data.email,
              maxRecords: data.maxRecords,
              maxStorage: data.maxStorage,
              maxFileSize: data.maxFileSize,
              upgrade: data.upgrade,
              business: data.business,
              plan: data.plan,
              expires: data.expires,
              autorenew: data.autorenew,
              receipt_url: data.receipt_url,
              totalRecords,
              totalStorage,
              idleTimeout: data.idleTimeout,
              desktop_inactivity: data.desktop_inactivity
            }
 
            data.totalRecords = totalRecords;
            data.totalStorage = totalStorage;
            if (window.location.href.includes("except")) {
              throw new Error('downloadUserData');
            }
            return data;
          })
          .catch(err => {
            if (window.location.href.includes("debug")) {
              alert(`387: ${err}`);
              return;
            }
            console.log('caught', err)
            window.location.href = `error_page.php?js=387&error=${err}`;
          });
          */
