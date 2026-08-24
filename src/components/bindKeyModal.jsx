import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import * as WWPass from 'wwpass-frontend';


import ModalCross from "./modalCross";

import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";

import InputField from "./inputField";
import TextAreaField from "./textAreaField";

import TextareaAutosize from "react-textarea-autosize";

import progress from "../lib/progress";



function BindKeyModal(props) {

  const scanCallback = (...args) => {
    console.log(`scanCallback argument count: ${args.length}`);
    args.forEach((arg, index) => {
      console.log(`scanCallback arg[${index}] type: ${typeof arg}, value:`, arg);
    });
  };

  let isShown = false;

  if (props.show) {
    if (!isShown) {
      isShown = true;
    }
  } else {
    isShown = false;
    return null;
  }

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {   // when mount

    WWPass.authInit({
      qrcode: '#qrcode',
      //      mobileLoginExtraButtons: document.querySelectorAll(".signin-mobile"),
      //      passkey: document.querySelector('#button--login'),
      ticketURL: `${getApiUrl()}getticket.php`,
      callbackURL: scanCallback,
      //      uiCallback,
      //      forcePasskeyButton: false,
      universal: true,
      fastForward: true,
    });
  }, []);

  const onNameChange = (e) => {
    setName(e.target.value);
    setErrorMsg("");
  };

  const onEmailChange = (e) => {
    setEmail(e.target.value);
    setErrorMsg("");
  };

  const onMessageChange = (e) => {
    setMessage(e.target.value);
    setErrorMsg("");
  };

  const onSubmit = () => {
    if (message.trim().length == 0) {
      setErrorMsg("please fill in the message field");
      return;
    }
    progress.lock();
    axios
      .post(`${getApiUrl()}contact_us.php`, {
        verifier: getVerifier(),
        name: name,
        email: email,
        message: message,
      })
      .then((reply) => {
        progress.unlock();
        const result = reply.data;
        if (result.status === "Ok") {
          props.onClose(1, "success");
          return;
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        setErrorMsg(result.status);
      })
      .catch((err) => {
        progress.unlock();
        setErrorMsg("Error sending email. Please try again later");
      });
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
        <div className="h2">Bind another WWPass Key</div>
      </div>
      <Modal.Body className="edit" style={{ marginBottom: "24px" }}>
        {errorMsg.length > 0 ? (
          <div style={{ color: "red", margin: "0 16px 16px" }}>
            <svg
              style={{
                width: "24px",
                height: "24px",
                fill: "red",
                marginRight: "16px",
              }}
            >
              <use href="#a-error"></use>
            </svg>
            {errorMsg}
          </div>
        ) : (
          ""
        )}

        <div id="qrcode" style={{ width: 256, margin: "32px auto" }}>

        </div>
        <InputField
          value={name}
          id="contact-us-name"
          label="Name"
          onChange={onNameChange}
          edit
        ></InputField>
        <InputField
          value={email}
          id="contact-us-email"
          label="Email"
          onChange={onEmailChange}
          edit
        ></InputField>

        <div className="itemNoteModalField">
          <TextareaAutosize
            id="contact-us-message"
            value={message}
            onChange={onMessageChange}
            placeholder="Type message here"
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="button" onClick={onSubmit}>
          Send
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default BindKeyModal;
