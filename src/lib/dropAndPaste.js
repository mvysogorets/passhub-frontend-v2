import axios from "axios";
import { getApiUrl, getVerifier } from "./utils";
import * as passhubCrypto from "./crypto";
import { getFolderById } from "../lib/utils";

function folderContainsPasskey(folder) {
  return (folder.items || []).some(item => item.type === "passkey")
    || (folder.folders || []).some(folderContainsPasskey);
}


function moveItemFinalize(recordID, src_safe, dst_safe, dst_folder, item, operation) {
  return axios
    .post(`${getApiUrl()}move.php`, {
      verifier: getVerifier(),
      id: recordID,
      src_safe, //state.currentSafe.id,
      dst_safe,
      dst_folder,
      item,
      operation,
    })
    .then(response => {
      const result = response.data;
      if (result.status === "Ok") {
        return result.status;
      }
      throw new Error(result.status);
    });
}

function moveFolder(safes, targetNode, folderID) {

  const dstBinaryKey = targetNode.safe ? targetNode.safe.bstringKey : targetNode.bstringKey;
  const srcFolder = getFolderById(safes, folderID);
  const targetSafe = targetNode.safe || targetNode;
  if (targetSafe.group && folderContainsPasskey(srcFolder)) {
    return Promise.reject({ message: "Passkeys cannot be moved to a group safe" });
  }
  const folder = passhubCrypto.encryptFolder(srcFolder, dstBinaryKey);
  if (srcFolder.path.length > 1) {
    if (srcFolder.path[srcFolder.path.length - 2][1] == targetNode.id) {
      console.log("move to parent: identity operation");
      return Promise.reject({ message: "move to parent: identity operation" });
    }
  }

  let dstSafe = targetNode.id;
  let dstFolder = 0;
  if (targetNode.safe) {
    dstSafe = targetNode.safe.id;
    dstFolder = targetNode.id;
    for (const pathEntry of targetNode.path) {
      if (pathEntry[1] == folderID) {
        return new Promise(function (resolve, reject) {
          reject({ message: "drop into child" });
        })
      };
    }
  }

  return axios
    .post(`${getApiUrl()}move.php`, {
      verifier: getVerifier(),
      folder,
      dstSafe,
      dstFolder
    })
    .then(response => response.data.status);
}


function doMove(safes, targetNode, item, operation) {
  if ("type" in item) { //ad-hoc folder
    return moveFolder(safes, targetNode, item.id);
  }

  const dstBinaryKey = targetNode.safe ? targetNode.safe.bstringKey : targetNode.bstringKey;
  const targetSafe = targetNode.safe || targetNode;
  if (item.type === "passkey" && targetSafe.group) {
    return Promise.reject({ message: "Passkeys cannot be moved to a group safe" });
  }

  let dst_safe = targetNode.id;
  let dstFolder = 0;
  if (targetNode.safe) {
    dst_safe = targetNode.safe.id;
    dstFolder = targetNode.id;
  }


  let src_safe = item.SafeID;

  /// --->> if src == dst, do nothing

  return axios
    .post(`${getApiUrl()}move.php`, {
      verifier: getVerifier(),
      id: item._id,
      src_safe,
      dst_safe,
      operation,
      checkRights: true,
    })
    .then(response => {
      const result = response.data;
      if (result.status === "Ok") {
        if ("file" in item) {
          const srcSafe = getFolderById(safes, item.SafeID);

          let eItem = passhubCrypto.moveFile(
            item,
            srcSafe.bstringKey,
            dstBinaryKey
          );
          return moveItemFinalize(
            item._id,
            src_safe,
            dst_safe,
            dstFolder,
            eItem,
            operation
          );
        }
        let options = {};
        if (item.note) {
          options["note"] = item.note;
        } else if (item.version === 5 || item.version === 6) {
          options["version"] = item.version;
        }
        let eItem = passhubCrypto.encryptItem(
          item.cleartext,
          dstBinaryKey,
          options,
          item.history
        );

        return moveItemFinalize(
          item._id,
          src_safe,
          dst_safe,
          dstFolder,
          eItem,
          operation
        );
      }

      throw new Error(result.status);
    })
};

export { doMove, moveFolder };
