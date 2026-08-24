import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

function DeleteItemModal(props) {


  const [errorMsg, setErrorMsg] = useState("");

  const queryClient = useQueryClient();

  const deleteItemAction = (args) => {
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          props.onClose();
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


  const deleteItemMutation = useMutation({
    mutationFn: deleteItemAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
    },
  })

  if (!props.show) {
    return null;
  }

  const onClose = () => {
    props.onClose(false);
  };

  const onSubmit = () => {
    deleteItemMutation.mutate({
      url: 'delete.php', args: {
        vault: props.args.safe.id,
        verifier: getVerifier(),
        id: props.args.item._id,
      }
    });
  }

  let path = [];
  let title = "";
  let modalTitle = "Delete Record";


  path = props.folder
    ? props.folder.path.map((e) => e[0]).join(" > ")
    : [];
  title = props.args.item.cleartext[0];

  if (props.args.item.file) {
    modalTitle = "Delete File";
  }
  if (props.args.item.note) {
    modalTitle = "Delete Note";
  }
  if (props.args.item.type === "passkey") {
    modalTitle = "Delete Passkey";
  }

  return (
    <Modal
      show={props.show}
      onHide={onClose}
      animation={false}
      centered
    >
      <div className="itemModalNav">
        <div className="itemModalPath">{path}</div>
        <div>
          <span
            style={{
              fontSize: "2rem",
              fontWeight: "400",
              position: "absolute",
              right: "0",
              marginRight: "20px",
              cursor: "pointer",
            }}
            onClick={props.onClose}
          >
            &#215;
          </span>
        </div>
      </div>
      <div className="ModalTitle h2">{modalTitle}</div>

      <Modal.Body>
        {errorMsg && (
          <div style={{ color: "red" }}>{errorMsg}</div>
        )}
        Do you really want to delete{" "}
        <span style={{ fontSize: "larger", fontWeight: "bold" }}>
          {title} ?
        </span>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" type="submit" onClick={onSubmit}>
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DeleteItemModal;
