import React, { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import ItemModalFieldNav from "./itemModalFieldNav";
import ItemViewIcon from "./itemViewIcon";
import ModalCross from "./modalCross";
import PathElement from "./pathElement";

// import { putCopyBuffer } from "../lib/copyBuffer";
import TextareaAutosize from "react-textarea-autosize";

import { limits } from "../lib/utils";

function ItemModal(props) {

  if (!props.show) {
    return null;
  }

  let _note = '';
  let _title = '';

  if (props.args.item) {
    if (props.args.item.version == 5) {
      _title = props.args.item.cleartext[1]
      _note = props.args.item.cleartext[2];
    } else {
      _title = props.args.item.cleartext[0]
      _note = props.args.item.cleartext[4]
    }
  }

  //  const [edit, setEdit] = useState(props.args.item ? false : true);
  const [title, setTitle] = useState(_title);
  const [note, setNote] = useState(_note);
  const [errorMsg, setErrorMsg] = useState('');

  const titleInput = React.createRef();
  const textAreaRef = React.createRef();

  const queryClient = useQueryClient();

  const copyMoveToastMutation = useMutation({
    mutationFn: (_args) => {
      Promise.resolve(_args).then(data => {
        console.log("copyMoveToast mutate", data);
        return data;
      })
    },
    onSuccess: (data, variables, context) => {
      console.log("setQueryData after copyMoveToast mutate", data, variables);
      queryClient.setQueryData(["copyMoveToast"], variables);
    },
  })

  const handleMove = () => {
    copyMoveToastMutation.mutate({ item: props.args.item, operation: "move", timestamp: Date.now() });
    props.onClose();
  };

  const handleCopy = () => {
    copyMoveToastMutation.mutate({ item: props.args.item, operation: "copy", timestamp: Date.now() });
    props.onClose();
  };

  const onTitleChange = (e) => {
    let _errorMsg = "";
    const maxLength = limits.MAX_TITLE_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      _errorMsg = `Title max length is ${maxLength} chars, truncated`;
    }

    setTitle(newValue);
    setErrorMsg(_errorMsg);
  };

  const onNoteChange = (e) => {
    let _errorMsg = "";
    const maxLength = limits.MAX_NOTE_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      _errorMsg = `Notes max length is ${maxLength} chars, truncated`;
    }

    setNote(newValue);
    setErrorMsg(_errorMsg);


    /* text area
    e.target.style.height = "auto";
    console.log(e.target.scrollHeight);
    e.target.style.height = e.target.scrollHeight + "px";
    */
  };

  const onNoteInput = (e) => {
    setNote(e.target.innerHTML);
  };

  const onShow = () => {
    props.edit && titleInput.current.focus();
  };

  const onClose = () => {
    props.onClose();
  };

  const onSubmit = () => {
    const _title = title.trim();
    if (_title == "") {
      setErrorMsg("Please set a title");
      return;
    }
    props.onSubmit(_title, note);
  };

  const onEdit = () => {
    if (props.limitedView) {
      return;
    }

    //    setEdit(true);

    if (props.onEdit) {
      props.onEdit();
    }
  };

  /*
  const setTitle = (aTitle) => {
    setTitle(aTitle);
  };
*/

  const onView = () => { };


  let path = [];
  let folderName = "";
  let lastModified = "";

  if (props.args.item) {
    path = props.args.item.path;
    if (props.args.item.lastModified) {
      lastModified = new Date(props.args.item.lastModified);
      lastModified = lastModified.toLocaleString();
    }
  } else if (props.args.folder) {
    path = props.args.folder.path;
  }

  folderName = path[path.length - 1][0];

  // const pathNames = path.map((e) => e[0]);
  // const pathString = pathNames.join(" > ");

  let pathString = [];
  for (let i = 0; i < path.length; i++) {
    pathString.push(
      <PathElement
        name={path[i][0]}
        folderid={path[i][1]}
        gt={path.length - i - 1}
        onClick={(f) => props.onCloseSetFolder(f)}
        key={`path${i}`}
      ></PathElement>
    );
  }

  /*
  let pathString = path.map((p) => (
    <PathElement
      name={path[i][0]}
      folderid={path[i][1]}
      gt={path.length - i - 1}
      onClick={(f) => this.props.onCloseSetFolder(f)}
    ></PathElement>
  ));
*/

  /*
  if (this.props.args.folder) {
    path = this.props.args.folder.path.join(" > ");
    folderName =
      this.props.args.folder.path[this.props.args.folder.path.length - 1];
  }
*/


  let modalClass = props.edit ? "edit" : "view";

  const maxHeight = props.isNote ? "" : "150px";

  let limitedView = props.limitedView ? true : false;

  return (
    <Modal
      show={props.show}
      onShow={onShow}
      onHide={onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div
        className="d-sm-none"
        style={{ cursor: "pointer", margin: "18px 0", color: "var(--link-color);" }}
        onClick={() => {
          props.onClose();
          /*
          if (this.props.searchMode) {
            this.props.onSearchClear();
          }

          if (folder.SafeID) {
            this.props.openParentFolder(folder);
          } else {
            document.querySelector("#safe_pane").classList.remove("d-none");
            document.querySelector("#table_pane").classList.add("d-none");
          }
          */
        }}
      >
        <svg
          width="24"
          height="24"
          style={{
            fill: "#009a50",
            transform: "rotate(90deg)",
          }}
        >
          <use href="#angle"></use>
        </svg>
        {folderName}
      </div>

      <div className="itemModalNav">
        <div className="itemModalPath d-none d-sm-block set-active-folder">
          {pathString}
        </div>
        {(!props.edit && !limitedView) ? (
          <div className="itemModalTools">
            {/*
                <ItemViewIcon iconId="#f-history" opacity="1" title="History" />
                */}
            {props.allowMove !== false && (
              <ItemViewIcon
                iconId="#f-move"
                title="Move"
                onClick={handleMove}
              />
            )}
            {props.args.item && !("file" in props.args.item) && props.allowCopy !== false && (
              <ItemViewIcon
                iconId="#f-copy"
                title="Copy"
                onClick={handleCopy}
              />
            )}
            <ItemViewIcon
              iconId="#f-trash"
              title="Delete"
              onClick={props.args.openDeleteItemModal}
            />
            <div className="itemModalEditButton" onClick={onEdit}>
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="#00BC62"
                style={{
                  verticalAlign: "unset",
                  marginRight: "10px",
                }}
              >
                <use href="#f-edit"></use>
              </svg>
              <span style={{ verticalAlign: "top" }}>Edit</span>
            </div>
          </div>
        ) : (
          <>
            {!limitedView && (
              <div className="itemModalTools edit">
                <div className="itemModalEditButton" onClick={onSubmit}>
                  <span style={{ verticalAlign: "top" }}>Save</span>
                </div>
              </div>)}
          </>
        )}
      </div>

      {props.edit ? (
        <Form.Control
          className="ModalTitle h2"
          ref={titleInput}
          type="text"
          onChange={onTitleChange}
          value={title}
          spellCheck="false"
          placeholder="Enter title"
        />
      ) : (
        <React.Fragment>
          <div className="itemModalTitle">
            <div className="h2">{title}</div>
          </div>
          <div
            style={{
              // position: "absolute",
              width: "100%",
              height: "1px",
              // left: 0,
              // top: "130px",
              background: "#E7E7EE",
            }}
          ></div>
          <div
            style={{
              color: "var(--body-color)",
              opacity: 0.7,
              fontStyle: "italic",
              textAlign: "end",
            }}
          >
            {lastModified}
          </div>
        </React.Fragment>
      )}

      <Modal.Body className={modalClass}>
        {errorMsg && (
          <div style={{ color: "red", marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}
        {props.children}

        <div className="itemNoteModalField">
          <ItemModalFieldNav name="Note" htmlFor="notes" />
          <div>
            {props.edit ? (
              <TextareaAutosize
                id="notes"
                value={note}
                onChange={onNoteChange}
                placeholder="Type notes here"
              />
            ) : (
              <div className="note-view">{note}</div>
            )}
          </div>
        </div>
      </Modal.Body>
      {props.errorMsg && props.errorMsg.length > 0 && (
        <div style={{ color: "red" }}>{props.errorMsg}</div>
      )}

      {props.edit && (
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={onSubmit}>
            Save
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}

export default ItemModal;
