import React, { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ModalCross from "./modalCross";

import { contextMenu, Menu, Item, } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";

import SafeUser from "./safeUser";
import ItemModalFieldNav from "./itemModalFieldNav";
import * as passhubCrypto from "../lib/crypto";
import { getUserData } from "../lib/userData";

function ShareModal(props) {

  const [userList, setUserList] = useState([]);
  const [email, setEmail] = useState("");
  const [invitedUserRights, setInvitedUserRights] = useState("can view");
  const [errorMsg, setErrorMsg] = useState("");
  const [showInvitationLink, setShowInvitationLink] = useState(false);
  const [isAdmin, setAdmin] = useState(false);

  const getSafeUsers = () => {
    const { folder } = props.args;
    const vault = folder.safe ? folder.safe.id : folder.id;

    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault: props.args.folder.id,
      })
      .then((reply) => {
        const result = reply.data;
        if (result.status == "group safe, siteadmin") {
          onClose(result.status);
          return;
        }
        if (result.status == "group safe") {
          onClose(result.status);
          return;
        }

        if (result.status === "Ok") {
          if (result.group_role) {
            return;
          }
          setUserList1(result.UserList);
          return;
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        setErrorMsg(result.status);
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  useEffect(() => {
    if (props.show) {
      getSafeUsers();

    } else {
      setUserList([]);
      setEmail("");
      setInvitedUserRights("can view");
      setErrorMsg("")
    }

  }, [props.show])

  if (!props.show) {
    return null;
  }

  let refreshOnClose = false;

  const onEmailChange = (e) => {
    setEmail(e.target.value);
    setErrorMsg("");
  };

  const onClose = (refresh = false) => {
    props.onClose(refresh || refreshOnClose);
  };


  const sendInvitationMessage = () => {
    props.sendInvitationMessage(email)
  }

  const userData = getUserData();
  let hiddenPasswordEnabled = false;
  if (userData.business && userData.HIDDEN_PASSWORDS_ENABLED) {
    hiddenPasswordEnabled = true;
  }

  const safeUserMenu = (
    <Menu id={"invited-user-menu"}>

      <Item
        onClick={(e) => {
          setInvitedUserRights("safe owner");
        }}
      >
        <div>
          <div>Safe owner</div>
          <div className="safe-user-menu-details">
            Additionaly can share safe and manage user access rights
          </div>
        </div>
      </Item>

      <Item
        onClick={(e) => {
          setInvitedUserRights("can edit");
        }}
      >
        <div>
          <div>Can Edit</div>
          <div className="safe-user-menu-details">
            User can edit, delete, and add files to the Safe
          </div>
        </div>
      </Item>

      <Item
        onClick={(e) => {
          setInvitedUserRights("can view");
        }}
      >
        <div>
          <div>Can view</div>
          <div className="safe-user-menu-details">
            User can only view records and download files
          </div>
        </div>
      </Item>

      <Item
        onClick={(e) => {
          setInvitedUserRights("limited view");
        }}
        hidden={!hiddenPasswordEnabled}
      >
        <div>
          <div>Limited view</div>
          <div className="safe-user-menu-details">
            User can only view records and download files, passwords are hidden
          </div>
        </div>
      </Item>

    </Menu>
  );

  const shareByMailFinal = async (username, eAesKey) => {
    let role = "readonly";
    if (invitedUserRights == "limited view") {
      role = "limited view";
    }
    if (invitedUserRights == "can edit") {
      role = "editor";
    }
    if (invitedUserRights == "safe owner") {
      role = "administrator";
    }

    const { folder } = props.args;
    let recipientSafeName = folder.name;

    let { email } = props.args;
    if (email) {
      const atIdx = email.indexOf("@");
      if (atIdx > 0) {
        email = email.substring(0, atIdx);
      }
      recipientSafeName += " /" + email;
    }
    const eName = await passhubCrypto.encryptSafeName(
      recipientSafeName,
      props.args.folder.subtleKey
    );

    const vault = folder.safe ? folder.safe.id : folder.id;

    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault,
        operation: "email_final",
        name: username,
        key: eAesKey,
        eName,
        vesrion: 3,
        // safeName: recipientSafeName,
        role,
      })
      .then((reply) => {
        const result = reply.data;
        if (result.status == "Ok") {
          /*
          const url =
            window.location.href.substring(
              0,
              window.location.href.lastIndexOf("/")
            ) + "/";
          const subj = "Passhub safe shared with you";
          const body = `${state.userMail} shared a Passhub safe with you.\n\n Please visit ${url}`;
          openmailclient.openMailClient(username, subj, body);
          */
          setEmail("");
          setErrorMsg("");
          refreshOnClose = true;
          getSafeUsers();
          return;
        }
        setErrorMsg(result.status);
        return;
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later")
      });
  };

  const onSubmit = () => {
    let peer = email.trim();
    if (peer.length < 1) {
      setErrorMsg("Recipient email should not be empty");
      return;
    }
    const { folder } = props.args;
    const [SafeID, safeAesKey] = folder.safe
      ? [folder.safe.id, folder.safe.key]
      : [folder.id, folder.key];

    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault: SafeID,
        operation: "email",
        origin: window.location.origin,
        name: peer,
      })
      .then((reply) => {
        const result = reply.data;
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }

        if (result.status == "Ok") {
          passhubCrypto.decryptAesKey(safeAesKey).then((aesKey) => {
            const hexPeerEncryptedAesKey = passhubCrypto.encryptAesKey(
              result.public_key,
              aesKey
            );
            shareByMailFinal(peer, hexPeerEncryptedAesKey);
          });
          return;
        }
        if (result.status.match(/User .* is not registered/)) {
          console.log('Hello')

          if (!userData.business) {
            setShowInvitationLink(true);
          }
        } else {
          setShowInvitationLink(false);
        }

        setErrorMsg(result.status);
        return;
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  const removeUser = (name) => {
    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault: props.args.folder.id,
        operation: "delete",
        name,
      })
      .then((reply) => {
        const result = reply.data;
        if (result.status == "Ok") {
          setUserList(result.UserList);
          return;
        }
        setErrorMsg(result.status);
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  const setUserRole = (name, role) => {
    if (role == "Remove") {
      removeUser(name);
      return;
    }

    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault: props.args.folder.id,
        operation: "role",
        name,
        role,
      })
      .then((reply) => {
        const result = reply.data;
        if (result.status == "Ok") {
          setUserList1(result.UserList);
          return;
        }
        setErrorMsg(result.status)
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  const onUnsubscribe = () => {
    const { folder } = props.args;
    const [SafeID, safeAesKey] = folder.safe
      ? [folder.safe.id, folder.safe.key]
      : [folder.id, folder.key];

    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault: SafeID,
        operation: "unsubscribe",
      })
      .then((reply) => {
        const result = reply.data;
        onClose(true);
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  const setUserList1 = (users) => {
    let _isAdmin = false;
    let filteredUserList = users.filter((user) => {
      if (user.myself && user.role == "administrator") {
        _isAdmin = true;
      }
      return user.name.length > 0 || user.myself;
    });
    setAdmin(_isAdmin);

    filteredUserList.sort((u1, u2) => {
      if (u1.myself && !u2.myself) {
        return -1;
      }
      if (!u1.myself && u2.myself) {
        return 1;
      }
      if (u1.name.toUpperCase() < u2.name.toUpperCase()) {
        return -1;
      }
      if (u1.name.toUpperCase() > u2.name.toUpperCase()) {
        return 1;
      }
      return 0;
    });
    setUserList(filteredUserList);
  };

  const getSafeUsersXX = () => {
    const { folder } = props.args;
    const vault = folder.safe ? folder.safe.id : folder.id;

    axios
      .post(`${getApiUrl()}safe_acl.php`, {
        verifier: getVerifier(),
        vault: props.args.folder.id,
      })
      .then((reply) => {
        const result = reply.data;
        if (result.status === "Ok") {
          setUserList(result.UserList);
          /*
          let filteredUserList = result.UserList.filter((user) => {
            if (user.myself && user.role == "administrator") {
              this.isAdmin = true;
            }
            return user.name.length > 0 || user.myself;
          });
          filteredUserList.sort((u1, u2) => {
            if (u1.myself && !u2.myself) {
              return -1;
            }
            if (u1.name.toUpperCase() < u2.name.toUpperCase()) {
              return -1;
            }
            if (u1.name.toUpperCase() > u2.name.toUpperCase()) {
              return 1;
            }
            return 0;
          });

          this.setState({ userList: filteredUserList });
*/
          return;
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        setErrorMsg(result.status);
      })
      .catch((err) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  ////////////////////////////////////////////////  render() {

  let title = props.args.folder.name;

  const recipientField =
    !isAdmin && userList.length > 0 ? (
      ""
    ) : (
      <div className="itemModalField" style={{ marginBottom: "16px" }}>
        <ItemModalFieldNav name="Email" />
        <div>
          <input
            onChange={onEmailChange}
            readOnly={false}
            spellCheck={false}
            value={email}
            type="text"

            onKeyDown={(e) => {
              if (e.key === "Enter")
                onSubmit();
            }}

          ></input>
        </div>
      </div>
    );

  let userCount = "Safe users";
  /*
  if (this.state.userList.length == 1) {
    userCount = "1 user has access";
  }
  if (this.state.userList.length > 1) {
    userCount = `${this.state.userList.length} users have access`;
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
          <svg width="32" height="32" style={{ marginRight: "14px" }}>
            <use href="#f-safe"></use>
          </svg>
        </div>

        <div className="h2">{title}</div>
      </div>

      <Modal.Body className="edit">
        {isAdmin && (
          <div style={{ marginBottom: "12px" }}>
            User invited:{" "}
            <span
              className="roleChanger"
              onClick={(e) => {
                contextMenu.show({ id: "invited-user-menu", event: e });
              }}
            >
              {invitedUserRights}
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
            </span>
            {safeUserMenu}
          </div>
        )}
        {!isAdmin && userList.length > 0 && (
          <div
            style={{
              marginBottom: "12px",
              color: "var(--warning-color)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              style={{
                fill: "none",
                width: "64px",
                height: "64px",
                marginRight: "14px",
              }}
            >
              <use href="#info-circle"></use>
            </svg>
            <div>
              Only safe owners can share access to the safe or change access
              rights of other users.
            </div>
          </div>
        )}
        {recipientField}
        {errorMsg.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: "red" }}>{errorMsg} </span>
            {showInvitationLink && (
              <div>
                <a href="#" style={{ color: "var(--link-color)" }} onClick={sendInvitationMessage}>Send an invitation message</a>
              </div>

            )}

          </div>
        )}
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "24px",
            }}
          >
            <Button onClick={onSubmit}>Share Safe</Button>
          </div>
        )}
        <div
          style={{
            fontSize: "14px",
            lineHeight: "22px",
            color: "var(--body-color70)",
            marginBottom: "20px",
          }}
        >
          {userCount}
        </div>
        {userList.map((user) => {
          return (
            <SafeUser
              key={user.name}
              user={user}
              isAdmin={isAdmin}
              setUserRole={setUserRole}
              hiddenPasswordEnabled={hiddenPasswordEnabled}
            />
          );
        })}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={() => {
            onClose();
          }}
        >
          Close
        </Button>
        {!isAdmin && userList.length > 0 && (
          <Button onClick={onUnsubscribe}>Unsubscribe</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default ShareModal;
