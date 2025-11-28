import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axios from "axios";
import { saveAs } from "file-saver";

import * as passhubCrypto from "../lib/crypto";
import {
  getApiUrl,
  getVerifier,
  atRecordsLimits,
  atStorageLimits,
  isMobile,
  humanReadableFileSize,
} from "../lib/utils";

import DownloadAndViewButtons from "./downloadAndViewButtons";

// import UpgradeModal from "./upgradeModal";

// import PlanLimitsReachedModal from "./planLimitsReachedModal";

// import PlanStorageLimitsReachedModal from "./planStorageLimitsReachedModal";

import ItemModal from "./itemModal";
// import ViewFile from "./viewFile";

import progress from "../lib/progress";

function getMimeByExt(filename) {
  const mimeType = {
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    gzip: "application/gzip",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    pdf: "application/pdf",
    png: "image/png",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    tif: "image/tiff",
    tiff: "image/tiff",
    txt: "text/plain",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
  };
  const i = filename.lastIndexOf(".");
  if (i !== -1) {
    const ext = filename.substr(i + 1).toLowerCase();
    if (ext in mimeType) {
      return mimeType[ext];
    }
  }
  // }
  return "application/octet-binary";
}

function isFileViewable(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot > 0) {
    const ext = filename.substring(dot + 1).toLowerCase();
    if (ext == "pdf") {
      if (isMobile()) {
        return false;
      }

      if (
        navigator.userAgent.indexOf("Chrome") == -1 &&
        navigator.userAgent.indexOf("Safari") > 0 &&
        navigator.userAgent.indexOf("Macintosh") > 0
      ) {
        return false;
      }
      return true;
    }
    if (
      ext == "jpeg" ||
      ext == "jpg" ||
      ext == "png" ||
      ext == "gif" ||
      ext == "bmp"

      /* || (ext == 'tif')
       || (ext == 'svg')  
      */
    ) {
      return true;
    }
  }
  return false;
}

function FileModal(props) {

  if (!props.show) {
    return null;
  }

  const [errorMsg, setErrorMsg] = useState("");
  const [theFile, setFile] = useState(null);
  // const [page, setPage] = useState("");
  const [title, setTitle] = useState(props.args.item ? props.args.item.cleartext[0] : "");
  const [edit, setEdit] = useState(props.args.item ? false : true);



  const queryClient = useQueryClient();

  const fileAction = (args) => {
    console.log('file Action: url', args.url, 'args', args.args);
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          // props.onClose(true, result.id);
          setEdit(false);
          return "Ok";
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        setErrorMsg(result.status);
        return;
      })
      .catch((err) => {
        console.log(err);
        setErrorMsg("Server error. Please try again later");
      });
  }

  const fileMutation = useMutation({
    mutationFn: fileAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
    },
  })

  let filename = "";
  let blob = null;

  /*
  constructor(props) {
    super(props);
    this.wrapperComponent = React.createRef();
  }
  */

  const wrapperComponent = React.createRef();

  const onEdit = () => {
    setEdit(true);
  };

  const onClose = () => {
    props.onClose();
  };

  function download(callBack) {
    let safe;

    if (props.args.safe) {
      safe = props.args.safe;
    } else if (props.args.folder.safe) {
      safe = props.args.folder.safe;
    } else {
      safe = props.args.folder;
    }

    const aesKey = safe.bstringKey;
    const SafeID = safe.id;

    progress.lock(0);
    axios
      .post(`${getApiUrl()}file_ops.php`, {
        operation: "download",
        SafeID,
        verifier: getVerifier(),
        itemId: props.args.item._id,
      })
      .then((reply) => {
        progress.unlock();
        const result = reply.data;
        if (result.status === "Ok") {
          const { filename, buf } = passhubCrypto.decryptFile(result, aesKey);
          const mime = getMimeByExt(filename);
          const blob = new Blob([buf], { type: mime });
          callBack(blob, filename);
          return;
        }
        if (result.status === "File not found") {
          return;
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        window.location.href = "error_page.php?js=other";
      })
      .catch((err) => {
        progress.unlock();
        setErrorMsg("Server error. Please try again later");
      });
  }

  const onDownload = () => {
    download(saveAs);
  };

  /*
  
    const inMemoryView = (blob, filename) => {
      blob = blob;
      filename = filename;
      setPage("ViewFile");
    };
  */

  const onView = () => {
    download(props.inMemoryView);
  };

  const onFileInputChange = (e) => {
    setFile(e.target.files[0]);
    setTitle(e.target.files[0].name);
    setErrorMsg("");

    wrapperComponent.current.setTitle(e.target.files[0].name);

    const { type, size, lastModifiedDate } = e.target.files[0];
    console.log(type, size, lastModifiedDate);
  };

  const onSubmit = (title, note) => {
    if (!props.args.item && !theFile) {
      setErrorMsg("No file defined");
      return;
    }

    const pData = [title, "", "", "", note];
    const options = {};

    let safe;

    if (props.args.safe) {
      safe = props.args.safe;
    } else if (props.args.folder.safe) {
      safe = props.args.folder.safe;
    } else {
      safe = props.args.folder;
    }

    const aesKey = safe.bstringKey;
    const SafeID = safe.id;
    const folderID = props.args.item
      ? props.args.item.folder
      : props.args.folder;

    const eData = passhubCrypto.encryptItem(pData, aesKey, options);

    if (props.args.item) {
      progress.lock(0);

      fileMutation.mutate({
        url: 'file_ops.php', args: {
          verifier: getVerifier(),
          operation: "rename",
          SafeID,
          itemId: props.args.item._id,
          newName: eData,
        }
      })
      return;
    }

    const reader = new FileReader();

    // progress.lock(0, 'Encrypting.');
    reader.readAsArrayBuffer(theFile);

    reader.onerror = (err) => {
      let error = "Error reading file";
      if (reader.error && reader.error.message) {
        error = reader.error.message;
      }
      setErrorMsg(error);
    };

    reader.onload = () => {
      const { fileInfo, cFileContent } = passhubCrypto.encryptFile(
        reader.result,
        aesKey
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
      progress.lock();

      fileMutation.mutate({ url: 'create_file.php', args: data });

    };
  };
  /*
    const gotoMain = () => {
      setPage("");
    };
  */
  //   render() {

  //     if (typeof this.props.args.item == "undefined") {
  //       if (atRecordsLimits()) {

  //         return (
  //           <UpgradeModal
  //             show={this.props.show}
  //             accountData={getUserData()}
  //             onClose={this.props.onClose}
  //           ></UpgradeModal>
  //         );
  // /*        
  //         return (
  //           <PlanLimitsReachedModal
  //             show={this.props.show}
  //             onClose={this.props.onClose}
  //           ></PlanLimitsReachedModal>
  //         );
  // */        
  //       }

  //       if (atStorageLimits()) {
  //         return (
  //           <PlanStorageLimitsReachedModal
  //             show={this.props.show}
  //             onClose={this.props.onClose}
  //           ></PlanStorageLimitsReachedModal>
  //         );
  //       }
  //     }


  let modalClass = edit ? "edit" : "view";

  // const path = this.props.folder ? this.props.folder.path.join(" > ") : [];

  return (
    <React.Fragment>
      <ItemModal
        show={props.show}
        args={props.args}
        onEdit={onEdit}
        onClose={props.onClose}
        onCloseSetFolder={props.onCloseSetFolder}
        ref={wrapperComponent}
        onSubmit={onSubmit}
        edit={edit}
        errorMsg={errorMsg}
      >
        {!props.args.item ? (
          <div
            className="itemModalField"
            style={{
              marginBottom: 62,
              position: "relative",
              background: "#E6F8EF",
              overflow: "visible",
            }}
          >
            <div
              style={{
                margin: "12px auto",
                color: "var(--link-color)",
                display: "table",
              }}
            >
              <svg width="24" height="24">
                <use href="#f-add"></use>
              </svg>
              <b>Upload file</b>
              <div>or drag & drop it here</div>
            </div>

            <svg
              width="151"
              height="134"
              style={{ position: "absolute", top: 16, left: 32 }}
            >
              <use href="#f-dragfile"></use>
            </svg>

            <input
              type="file"
              id="inputFileModal"
              onChange={onFileInputChange}
              multiple={true}
            ></input>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "40px",
            }}
          >
            <svg width="105" height="132" style={{ marginBottom: "32px" }}>
              <use href="#f-file-m"></use>
            </svg>
            <div style={{ marginBottom: "24px" }}>
              <span style={{ color: "var(--body-color)", opacity: 0.7 }}>
                {humanReadableFileSize(props.args.item.file.size)}
              </span>
            </div>
            {!edit && (
              <DownloadAndViewButtons
                onDownload={onDownload}
                view={isFileViewable(title)}
                onView={onView}
              ></DownloadAndViewButtons>
            )}
          </div>
        )}
      </ItemModal>
      {/*      
      <ViewFile
        show={page === "ViewFile"}
        gotoMain={gotoMain}
        filename={filename}
        blob={blob}
      />
            */}

    </React.Fragment>
  );
}

export default FileModal;

