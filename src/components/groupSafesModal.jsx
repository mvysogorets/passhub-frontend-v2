import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import {
  contextMenu,
  Menu,
  Item,
} from "react-contexify";
import "react-contexify/dist/ReactContexify.css";

import Select from 'react-dropdown-select';

import ModalCross from "./modalCross";

import axios from "axios";
import { getApiUrl, getFolderById, getVerifier } from "../lib/utils";

import * as passhubCrypto from "../lib/crypto";
import { getUserData } from "../lib/userData";

function GroupSafesModal(props) {

  if (!props.show) {
    return null;
  }
  const group = props.group;
  const [errorMsg, setErrorMsg] = useState("");
  const [values, setValues] = useState([]);
  const [role, setRole] = useState("can view");


  const groupAction = (args) => {
    console.log('group Action: url', args.url, 'args', args.args);
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          //          props.onClose(true, result.id);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userList"], exact: true })
    },
  })

  const onClose = () => {
    props.onClose();
  };

  function addSafeToGroup(safe) {
    console.log(safe);

    let serverRole = role;
    if (role == "can view") {
      serverRole = "readonly";
    }
    if (role == "can edit") {
      serverRole = "editor";
    }

    // encrypt bstring key
    const encrypted_key = passhubCrypto.encryptSafeKey(safe.bstringKey, group.bstringKey);

    groupMutation.mutate({
      url: 'group.php',
      args: {
        verifier: getVerifier(),
        operation: "addSafe",
        SafeID: safe.id,
        groupId: group.GroupID,
        role: serverRole,
        eName: safe.eName,
        version: safe.version,
        encrypted_key
      }
    })
  }

  const setSafeRole = (safeId, role) => {
    let serverRole = role;
    if (role == "can view") {
      serverRole = "readonly";
    }
    if (role == "can edit") {
      serverRole = "editor";
    }

    groupMutation.mutate({
      url: 'group.php',
      args: {
        verifier: getVerifier(),
        operation: "role",
        groupId: group.GroupID,
        safeId,
        role: serverRole
      }
    })
  }
  const removeSafe = (safe) => {
    groupMutation.mutate({
      url: 'group.php',
      args: {
        verifier: getVerifier(),
        operation: "removeSafe",
        groupId: group.GroupID,
        safeId: safe.id
      }
    })
  }



  const allSafes = getUserData().safes;

  const onAdd = () => {
    if (values.length > 0) {
      const safe = getFolderById(allSafes, values[0].value);
      setValues([]);
      addSafeToGroup(safe);
    }
  }

  const groupSafeIDs = group.safes.map(s => s.SafeID)

  const ownSafes = allSafes.filter(safe => (safe.user_role == "administrator") && !groupSafeIDs.includes(safe.id));

  const ownSafes1 = ownSafes.map(s => {
    return { value: s.id, label: s.name }
  })

  let title = `Group ${group.name} safes`;
  let icon = "#f-safe";


  let userData = getUserData()
  let hiddenPasswordEnabled = false;
  if (userData.business && userData.HIDDEN_PASSWORDS_ENABLED) {
    hiddenPasswordEnabled = true;
  }


  const rightsMenuItems = [
    { name: "Can edit", details: "User can edit, delete, and add files to the Safe", role: "can edit" },
    { name: "Can view", details: "User can only view records and download files", role: "can view" },
    { name: "Limited view", details: "User can only view records and download files, passwords are hidden", role: "limited view", hidden: !hiddenPasswordEnabled }
  ];



  const rightsMenu = (
    <Menu id={"rights-menu"}>

      {rightsMenuItems.filter((item) => !item.hidden).map((item) => (

        <Item onClick={(e) => {
          console.log(e);
          if (!e.props.safe) {

            setRole(item.role)
            return;
          }
          if (e.props.safe.role != item.role) {
            setSafeRole(e.props.safe.id, item.role);
          }
        }}
          key={item.role}
        >
          <div>
            <div>{item.name}</div>
            <div className="safe-user-menu-details">
              {item.details}
            </div>
          </div>

        </Item>
      ))}
    </Menu>
  );

  const showRightsMenu = (e, safe) => {
    contextMenu.show({
      id: "rights-menu",
      event: e,
      props: { safe },
    });
  };

  // const cmpByName = ((a, b) => a.name.localeCompare(b.name));

  const folders = group.safes.map(s => {
    const f = getFolderById(allSafes, s.SafeID);
    f.role = s.role;
    return f;
  });

  //   const sortedFolders = folders.toSorted(cmpByName);
  const sortedFolders = [...folders];
  sortedFolders.sort((a, b) => a.name.localeCompare(b.name));



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
        {rightsMenu}
        <div style={{ marginBottom: "16px" }}>
          Group members rights:
          <div className="roleChanger" onClick={(e) => showRightsMenu(e, null)}>
            {role}

            <svg
              width="24"
              height="24"
              style={{
                verticalAlign: "top",
                fill: "var(--link-color)",
              }}
            >
              <use href="#angle"></use>
            </svg>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 24 }}>
          <div style={{ flexGrow: 1 }}>

            <Select
              style={{ height: 48, borderRadius: 12, minWidth: 354 }}
              options={ownSafes1}
              labelField="label"
              values={[...values]}
              onChange={(values) => {
                console.log(values);
                setValues(values);
              }}
              placeholder="Select safe to add.."
            />
          </div>
          <Button variant="primary" onClick={onAdd} style={{ marginLeft: "auto" }}>
            Add
          </Button>
        </div>

        <div style={{
          marginTop: "36px",
          marginBottom: "16px",
          fontSize: "18px",
          fontWeight: 700
        }}>
          Group safes
        </div>
        <div style={{ maxHeight: "calc(100vh - 500px)", overflowY: "auto" }}>
          {sortedFolders.map(folder => {
            let groupRole = folder.role ? folder.role : "can view";
            if (groupRole == "editor") {
              groupRole = "can edit"
            }
            if (groupRole == "readonly") {
              groupRole = "can view"
            }


            return (
              <div className="group-safe-entry" >
                <span style={{ cursor: "pointer", padding: "0 0.5em 0 1em" }} onClick={() => removeSafe(folder)} title="remove">
                  <svg
                    style={{
                      strokeWidth: "0",
                      fill: "red",
                      width: "1em",
                      height: "1em",
                    }}
                  >
                    <use href="#cross"></use>
                  </svg>
                </span>
                <div style={{ flexGrow: 1 }}>
                  <div className="group-safe-entry-name">{folder.name}</div>
                </div>

                <div className="roleChanger" onClick={(e) => showRightsMenu(e, folder)}>
                  {groupRole}

                  <svg
                    width="24"
                    height="24"
                    style={{
                      verticalAlign: "top",
                      fill: "#009A50",
                    }}
                  >
                    <use href="#angle"></use>
                  </svg>
                </div>

              </div>
            )
          })}
        </div>




        {errorMsg.length > 0 && (
          <div style={{ color: "red" }}>{errorMsg}</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default GroupSafesModal;
