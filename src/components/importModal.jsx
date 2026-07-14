import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { getApiUrl, getVerifier } from "../lib/utils";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ModalCross from "./modalCross";

import importXML from "../lib/importXML";
import importJSON from "../lib/importJSON";
import importCSV from "../lib/importCSV";
import import1PUX from "../lib/import1PUX";
import importMerge from "../lib/importMerge";
import { createSafeFromFolder } from "../lib/crypto";
import progress from "../lib/progress";

function ImportModal(props) {

  if (!props.show) {
    return null;
  }

  const [mode, setMode] = useState("new safe");
  const [theFile, setFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const queryClient = useQueryClient();


  const handleModeChange = (e) => {
    setMode(e);
  };

  const onFileInputChange = (e) => {
    setFile(e.target.files[0]);
    // setTitle( e.target.files[0].name);
    setErrorMsg("");
  }

  const uploadImportedData = (safeArray) => {
    if (safeArray.length === 0) {
      progress.unlock();
      props.onClose(true);
      return;
    }
    axios
      .post(`${getApiUrl()}impex.php`, {
        verifier: getVerifier(),
        import: safeArray,
      })
      .then((reply) => {
        const result = reply.data;
        progress.unlock();
        if (result.status === "Ok") {
          queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
          props.onClose(true);
          return;
        }
        progress.unlock();
        setErrorMsg(result.status);
        return;
      })
      .catch((error) => {
        progress.unlock();
        setErrorMsg("Server error. Please try again later");
      });
  };

  const onSubmit = () => {

    if (!theFile) {
      setErrorMsg("Please select a backup file");
      return;
    }

    const extension = theFile.name.split(".").pop().toLowerCase();

    if (!['csv', 'xml', 'json', '1pux'].includes(extension)) {
      setErrorMsg("Unsupported file type, only XML, CSV, JSON, and 1PUX are allowed");
      return;
    }

    if (theFile.size > 3000000) {
      setErrorMsg("File too large");
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => {
      console.log(err, err.loaded, err.loaded === 0, theFile.name);
      setErrorMsg("Error loading file");
    };


    function delay() {
      return new Promise(function (resolve) {
        setTimeout(resolve, 3000);
      });

    }

    reader.onload = () => {
      const text = reader.result;
      let imported = {};
      try {
        if (extension === "1pux") {

          return import1PUX(text, theFile.name, mode).then((data) => {
            console.log('import1PUX returns');
            console.log(data);
            if (data.startsWith("Error")) {
              progress.unlock();
              setErrorMsg(err);
            } else {
              queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
              props.onClose(true);
            }
          })
            .catch(err => {
              progress.unlock();
              setErrorMsg(err);
              return;
            })
        }
        if (extension === "xml") {
          imported = importXML(text);
        } else if (extension === "json") {
          imported = importJSON(text);
          imported.name = theFile.name;
        } else {
          imported.name = theFile.name;
          imported.items = [];
          const importResult = importCSV(text);
          if (typeof (importResult) == 'string') {
            progress.unlock();
            console.log('Import result ' + importResult);
            setErrorMsg(importResult);
            return;
          }
          imported.folders = importResult;
        }
      } catch (err) {
        progress.unlock();
        setErrorMsg(err);
        return;
      }

      if (mode !== "restore") {
        let importedSafe;
        if ((imported.folders.length == 1) && (imported.folders[0].name == 'lastpass')) {
          imported.folders[0].name = imported.name;
          importedSafe = createSafeFromFolder(imported.folders[0]);
        } else {
          importedSafe = createSafeFromFolder(imported);
        }
        uploadImportedData([importedSafe]);
      } else {
        const safeArray = importMerge(imported.folders, props.safes);
        uploadImportedData(safeArray);
      }
    };
    progress.lock();
    if (extension === "1pux") {
      reader.readAsArrayBuffer(theFile);
    } else {
      reader.readAsText(theFile);
    }
  };

  return (
    <Modal
      show={props.show}
      onHide={props.onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle">
        <div className="h2">Import</div>
      </div>

      <Modal.Body>
        {errorMsg != "" ? (
          <p style={{ color: "red" }}>{errorMsg}</p>
        ) : (
          ""
        )}
        <div className="import-modal-file-field">
          <div
            style={{
              flexGrow: 1,
              fontSize: "18px",
              lineHeight: "24px",
              padding: "12px 0 0 12px",
            }}
          >
            {theFile ? theFile.name : "Choose file"}
          </div>
          <Button variant="primary" type="submit" onClick={onSubmit}>
            Browse
          </Button>

          <input
            type="file"
            accept=".xml,.csv,.json,.1pux"
            id="inputFileModal"
            onChange={onFileInputChange}
          ></input>
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: "22px",
            marginBottom: 32,
          }}
        >
          <b>Supports:</b> KeePass&nbsp;2.x&nbsp;XML, Bitwarden&nbsp;JSON,  1Password&nbsp;1PUX, KeePassX&nbsp;CSV,
          Chrome&nbsp;passwords&nbsp;CSV, Firefox&nbsp;passwords&nbsp;CSV, Safari&nbsp;passwords&nbsp;CSV,
          Lastpass&nbsp;CSV, DashLane&nbsp;CSV, 1Password&nbsp;CSV
        </div>
        <div style={{ marginBottom: 0 }}>
          {[
            {
              mode: "restore",
              comment: "Restore. Merge into existing safes where possible",
            },
            { mode: "new safe", comment: "Import into a new safe" },
          ].map((e) => (
            <div
              key={e.mode}
              style={{ display: "flex", marginBottom: 12 }}
              onClick={() => {
                handleModeChange(e.mode);
              }}
            >
              <div>
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  style={{ margin: "0 14px 3px 0" }}
                >
                  <use
                    href={
                      mode == e.mode
                        ? "#f-radio-checked"
                        : "#f-radio"
                    }
                  ></use>
                </svg>
              </div>
              <div style={{ cursor: "default" }}>
                {mode == e.mode ? (
                  <div>
                    <b>{e.comment}</b>
                  </div>
                ) : (
                  <div>{e.comment}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" onClick={onSubmit}>
          Import
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ImportModal;
