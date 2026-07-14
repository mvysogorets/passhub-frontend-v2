import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";


import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";


import ModalCross from "./modalCross";
import ItemModalFieldNav from "./itemModalFieldNav";

// import PlanLimitsReachedModal from "./planLimitsReachedModal";
// import UpgradeModal from "./upgradeModal";

// import PlanStorageLimitsReachedModal from "./planStorageLimitsReachedModal";

// import progress from "../lib/progress";

import * as passhubCrypto from "../lib/crypto";
import {
  getApiUrl,
  getVerifier,
  atRecordsLimits,
  atStorageLimits,
  humanReadableFileSize,
} from "../lib/utils";
import progress from "../lib/progress";



const uploadFileP = (theFile, SafeID, folderID, note, aesKey, props) =>
  theFile.arrayBuffer()
    .then(pFileContent => {

      const { fileInfo, cFileContent } = passhubCrypto.encryptFile(
        pFileContent,
        aesKey
      );
      const title = theFile.name;

      const pData = [title, "", "", "", note];
      const options = {};

      const eData = passhubCrypto.encryptItem(
        pData,
        aesKey,
        options
      );

      const data = new FormData();
      data.append("vault", SafeID);
      data.append("folder", folderID);
      data.append("verifier", getVerifier());

      data.append("meta", eData);
      data.append("file", fileInfo);
      const ab = passhubCrypto.str2uint8(cFileContent);
      const bl = new Blob([ab]);
      data.append("blob", bl);
      return axios
        .post(`${getApiUrl()}create_file.php`, data, {
          headers: {
            "content-type": "multipart/form-data",
          },
          timeout: 600000,
        })
        .then(response => {
          const result = response.data;

          if (result.status === "Ok") {
            if (result.firstID) {
              props.newItemInd(result.firstID);
            }
            return result;
          }
          if (response.status === "login") {
            window.location.href = "expired.php";
            return;
          }
          throw new Error(result.status);
        })
    })

function uploadFiles({ files, SafeID, folderID, note, aesKey, props }) {

  let promise = Promise.resolve();
  for (let i = 0; i < files.length; i++) {
    promise = promise.then(() => uploadFileP(files[i], SafeID, folderID, note, aesKey, props))
  }
  return promise;
}

function CreateFileModal(props) {

  const [files, setFiles] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [note, setNote] = useState("");

  const queryClient = useQueryClient();

  const fileMutation = useMutation({
    mutationFn: uploadFiles,
    onSuccess: data => {
      progress.unlock();
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true });
      onClose();
    },
    onError: err => {
      progress.unlock();
      setErrorMsg(err.toString());
    },
  })

  const onClose = () => {
    props.onClose();
  };

  const onFileInputChange = (e) => {
    setFiles(e.target.files);
    setErrorMsg("");
  };

  const onNoteChange = (e) => setNote(e.target.value);

  const onSubmit = () => {
    if (!files) {
      setErrorMsg("No file chosen");
      return;
    }

    const [aesKey, SafeID, folderID] = props.args.folder.safe
      ? [
        props.args.folder.safe.bstringKey,
        props.args.folder.safe.id,
        props.args.folder.id,
      ]
      : [props.args.folder.bstringKey, props.args.folder.id, 0];

    progress.lock(0, "file upload");
    //    return uploadFiles( files, SafeID, folderID, note, aesKey)
    fileMutation.mutate({ files, SafeID, folderID, note, aesKey, props });
    return;
    /*
    
    
    
        return fileMutation.mutate( files, SafeID, folderID, note, aesKey)
        .then(() => {
          // progress.unlock();      
          //console.log("129 uploaded")
          props.onClose(true);
          return;
        })
        .catch(err => {
          // progress.unlock();      
          console.log(`upload file promise rejected`);
          console.log(err);
          if(err.message == "login") {
              window.location.href = "expired.php";
              return;
          }
          if(err.message == "expired") {
            window.location.href = "expired.php";
            return;
          }
          setErrorMsg(err.message);
        });
    */

  }

  let fileNameArray = [];
  if (files) {
    for (let i = 0; i < files.length; i++) {
      fileNameArray.push(files[i].name);
    }
  }

  /*
      if (atRecordsLimits()) {
        return (
          <UpgradeModal
            show={props.show}
            accountData={getUserData()}
            onClose={props.onClose}
          ></UpgradeModal>
        );
      }
  
      if (atStorageLimits()) {
        return (
          <PlanStorageLimitsReachedModal
            show={this.props.show}
            onClose={this.props.onClose}
          ></PlanStorageLimitsReachedModal>
        );
      }
  */
  return (
    <Modal
      show={props.show}
      onHide={onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle" style={{ alignItems: "center" }}>
        <div>
          <svg
            width="32"
            height="32"
            style={{ marginRight: "14px" }}
            stroke="var(--body-color)"
          >
            <use href="#i-file"></use>
          </svg>
        </div>

        <div className="h2">Upload File</div>
      </div>
      <Modal.Body className="edit">
        {errorMsg && (
          <div style={{ color: "red", marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}
        <div className="import-modal-file-field">
          <div
            style={{
              flexGrow: 1,
              fontSize: "18px",
              lineHeight: "24px",
              padding: "12px 0 0 12px",
              overflowWrap: "anywhere",
            }}
          >
            {(fileNameArray.length == 0) && (<div className="filename" style={{ marginBottom: "6px", maxWidth: "330px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", }}>Choose file(s)</div>)}
            {fileNameArray.map((f) => (<div className="filename">{f}</div>))}
          </div>
          <Button variant="primary" type="submit" onClick={onSubmit} style={{ height: "48px", marginTop: ((fileNameArray.length > 1) ? "12px" : "0") }}>
            Browse
          </Button>

          <input type="file" onChange={onFileInputChange} multiple></input>
        </div>
        <div className="itemNoteModalField">
          <ItemModalFieldNav name="Note" />
          <div>
            <textarea
              className="notes"
              onChange={onNoteChange}
              spellCheck={false}
              value={note}
              style={{ width: "100%" }}
              rows="5"
              placeholder="Type notes here"
            ></textarea>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>

        <Button variant="primary" type="submit" onClick={onSubmit}>
          Upload
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CreateFileModal;
