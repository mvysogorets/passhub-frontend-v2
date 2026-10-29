import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import ModalCross from "./modalCross";
import InputField from "./inputField";

import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";

import * as passhubCrypto from "../lib/crypto";

function GroupNameModal(props) {

  if (!props.show) {
    return null;
  }

  const groupAction = (args) => {
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          props.onClose(true, result.id);
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

  const queryClient = useQueryClient();

  const groupMutation = useMutation({
    mutationFn: groupAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userList"], exact: true })
    },
  })

  const [name, setName] = useState(props.group ? props.group.name : "");
  const [errorMsg, setErrorMsg] = useState("");

  let title = "";

  const onClose = () => {
    props.onClose();
  };

  const onSubmit = async () => {
    const _name = name.trim();
    if (_name.length == 0) {
      setName(_name);
      setErrorMsg("* Please fill in the name field");
      return;
    }

    if (!props.group) {   // create a group
      if (props.groups) {
        for (const group of props.groups) {
          if (_name == group.name) {
            setErrorMsg(`Group ${_name} already exists`);
            return;
          }
        }
      }

      const group = await passhubCrypto.createGroup(_name);

      groupMutation.mutate({
        url: 'group.php', args: {
          verifier: getVerifier(),
          operation: "create",
          group,
        }
      });
      return;
    }

    for (const group of props.groups) {
      if (_name == group.name) {
        if (props.group.GroupID != group.GroupID) {
          setErrorMsg(`Group ${_name} already exists`);
          return;
        }
        props.onClose();
        return;
      }
    }


    const eName = await passhubCrypto.encryptGroupName(
      _name,
      props.group.subtleKey
    );
    groupMutation.mutate({
      url: 'group.php', args: {
        verifier: getVerifier(),
        groupId: props.group.GroupID,
        operation: "rename",
        eName,
        version: 3,
      }
    });
    return;

  };

  const handleChange = (e) => {
    setName(e.target.value);
    setErrorMsg("");
  }

  const keyUp = (e) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  title = "Create User Group";
  let icon = "#f-safe";
  let titleClass = "safe-name-title";

  if (props.group) {
    [title, icon, titleClass] = ["Rename User Group", "#f-safe", "safe-name-title"]
  } else {
    [title, icon, titleClass] = ["Create User Group", "#f-safe", "safe-name-title"];
  }

  return (
    <Modal
      show={props.show}
      onHide={onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>

      <div className="modalTitle" style={{ alignItems: "center" }}>
        {/*
          <div>
            <svg width="32" height="32" style={{ marginRight: "14px" }}>
              <use href={icon}></use>
            </svg>
          </div>
  */}
        <div className="h2">{title}</div>
      </div>

      <Modal.Body className="edit">
        <InputField
          id="groupNameModalInput"
          label="Name"
          placeHolder="Group Name"
          value={name}
          edit
          autoFocus
          autoComplete="off"
          onChange={handleChange}
          onKeyUp={keyUp}
        ></InputField>
        {errorMsg.length > 0 && (
          <div style={{ color: "red" }}>{errorMsg}</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>

        <Button variant="primary" type="submit" onClick={onSubmit}>
          {props.group ? "Rename" : "Create"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default GroupNameModal;
