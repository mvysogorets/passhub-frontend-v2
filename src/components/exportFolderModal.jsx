import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ModalCross from "./modalCross";
import CheckBox from "./checkBox";
import Eye from "./eye";

import { saveAs } from "file-saver";

import exportXML from "../lib/exportXML";
import exportCSV from "../lib/exportCSV";
import exportZip from "../lib/exportZip";
import { getUserData } from "../lib/userData";

function ExportFolderModal(props) {

  if (!props.show) {
    return null;
  }

  const [format, setFormat] = useState("XML");
  const [zipProtect, setZipProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleFormatChange = (e) => {
    setFormat(e)
  };

  const onToggleZipProtect = () => {
    setZipProtect(!zipProtect);
  };

  const onPasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const onClose = () => {
    setZipProtect(false);
    setPassword("");
    setShowPassword(false);
    setExporting(false);
    props.onClose();
  };

  const onSubmit = async () => {
    if (zipProtect && password.length === 0) {
      return;
    }

    let folder = props.folder ? props.folder : getUserData().safes;
    const filename = format === "XML" ? "passhub.xml" : "passhub.csv";
    const blob = format === "XML" ? exportXML(folder) : exportCSV(folder);

    if (zipProtect) {
      setExporting(true);
      try {
        const zipBlob = await exportZip(filename, blob, password);
        saveAs(zipBlob, "passhub.zip");
      } finally {
        setExporting(false);
      }
    } else {
      saveAs(blob, filename);
    }
    onClose();
  };

  const formatEntries = [
    { format: "XML", comment: "KeePass 2.0 compatible, RECOMMENDED" },
    { format: "CSV", comment: "Readable, Excel compatible" },
  ];

  let title = "Export all safes and folders";

  if (
    props.show &&
    props.folder &&
    !Array.isArray(props.folder)
  ) {
    const folderName =
      props.folder.path[props.folder.path.length - 1][0];
    const isSafe = props.folder.path.length < 2;
    const folderType = isSafe ? "Safe" : "Folder";
    title = `Export ${folderType}: ${folderName}`;
  }

  return (
    <Modal
      show={props.show}
      onHide={onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle">
        <div className="h2">{title}</div>
      </div>
      <Modal.Body>
        <div style={{ marginBottom: 12 }}>
          {formatEntries.map((e) => (
            <div
              key={e.format}
              style={{ display: "flex", marginBottom: 12 }}
              onClick={() => {
                handleFormatChange(e.format);
              }}
            >
              <div>
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  style={{ marginRight: "14px" }}
                >
                  <use
                    href={
                      format === e.format
                        ? "#f-radio-checked"
                        : "#f-radio"
                    }
                  ></use>
                </svg>
              </div>
              <div>
                <div><b>{e.format}</b></div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{e.comment}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <CheckBox checked={zipProtect} onClick={onToggleZipProtect}>
            Save as password-protected ZIP file
          </CheckBox>

          {zipProtect && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={onPasswordChange}
                placeholder="ZIP password"
                autoFocus
                style={{ flexGrow: 1 }}
              ></input>
              <Eye onClick={() => setShowPassword(!showPassword)} hide={!showPassword} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", color: "var(--warning-color)" }}>
          <div>
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="var(--warning-color)"
              style={{ marginRight: "14px" }}
            >
              <use href="#no-files-exported"></use>
            </svg>
          </div>
          <div>
            <b>Files and images will not be exported.<br></br> Unfortunately, you
              need to download them manually</b>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          onClick={onSubmit}
          disabled={exporting || (zipProtect && password.length === 0)}
        >
          {exporting ? "Exporting..." : "Export"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ExportFolderModal;
