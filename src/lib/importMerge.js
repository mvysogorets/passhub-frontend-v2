
import { createSafeFromFolder, encryptItem, encryptFolder, decryptAesKey } from "./crypto";

function findSafeByName(safes, name) {
  for (let i = 0; i < safes.length; i++) {
    if (safes[i].name === name) {
      return safes[i];
    }
  }
  return null;
}

function itemStatus(site, backup_item) {
  let found = false;
  for (let s = 0; s < site.items.length; s++) {
    const { cleartext } = site.items[s];
    if (cleartext[0] == backup_item.cleartext[0]) {
      if ((cleartext[1] == backup_item.cleartext[1]) 
        && (cleartext[2] == backup_item.cleartext[2])
        && (cleartext[3] == backup_item.cleartext[3]) 
        && (cleartext[4] == backup_item.cleartext[4])) {
        return 'equal';
      }
      found = true; // may be next with the same name
    }
  }
  return found ? 'different' : 'absent';
}

function mergeItems(site, backup) {
  const result = [];
  for (let b = 0; b < backup.items.length; b++) {
    const status = itemStatus(site, backup.items[b]);
    if (status === 'absent') {
      result.push(backup.items[b]); // cipher
      continue;
    } else if (status === 'equal') {
      continue;
    }
    const title = backup.items[b].cleartext[0];
    for (let n = 1; ; n++) {
      if (n > 100) {
        alert('error 601');
        break;
      }
      backup.items[b].cleartext[0] = `${title}(${n})`;
      const status1 = itemStatus(site, backup.items[b]);
      if (status1 === 'absent') {
        result.push(backup.items[b]); // cipher
        break;
      }
      if (status1 === 'equal') {
        break;
      }
    }
  }
  return result;
}

function mergeFolders(site, backup) {
  const result = [];
  if ('folders' in backup) {
    for (let b = 0; b < backup.folders.length; b++) {
      let found = false;
      for (let s = 0; s < site.folders.length; s++) {
        if (backup.folders[b].name == site.folders[s].cleartext[0]) {
          found = true;
          const items = mergeItems(site.folders[s], backup.folders[b]);
          const folders = mergeFolders(site.folders[s], backup.folders[b]);
          if ((items.length !== 0) || (folders.length !== 0)) {
            result.push({ _id: site.folders[s]._id, items, folders }); // add folder name and id
          }
        }
      }
      if (!found) {
        result.push(backup.folders[b]);
      }
    }
  }
  return result;
}

function mergeSafe(site, backup) {

  const new_items = mergeItems(site, backup);
  const new_folders = mergeFolders(site, backup);
  if ((new_items.length === 0) && (new_folders.length === 0)) {
    return null;
  }

  return { id: site.id, items: new_items, folders: new_folders};
}

async function encryptAdditions(safeAdditions, safe) {
  const result = { items: [], folders: [] };

  // const aes_key = site.aes_key;
  const newItems = safeAdditions.items; 
  for (let e = 0; e < newItems.length; e++) {
    result.items.push(await encryptItem(newItems[e].cleartext, safe.subtleKey, newItems[e].options));
  }
  const newFolders = safeAdditions.folders;
  for (let f = 0; f < newFolders.length; f++) {
    result.folders.push(await encryptFolder(newFolders[f], safe));
  }
  return { id: safeAdditions.id, items: result.items, folders: result.folders };
}

async function importMerge(importedFolders, flatSafeArray) {
      const restoreDiff = [];
      const encryptionPromises = [];
      for (let f = 0; f < importedFolders.length; f++) {
        const siteSafe = findSafeByName(flatSafeArray, importedFolders[f].name);
        if (!siteSafe) {
          restoreDiff.push(await createSafeFromFolder(importedFolders[f]));
          continue;
        }
        const safeAdditions = mergeSafe(siteSafe, importedFolders[f]);
        if (!safeAdditions) {
          continue;
        }
        const eSafe = await encryptAdditions(safeAdditions, siteSafe);
        restoreDiff.push(eSafe);
      }
      return restoreDiff;
}

export default importMerge;