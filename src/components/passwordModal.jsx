import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axios from "axios";

import * as base32 from "hi-base32";

import * as passhubCrypto from "../lib/crypto";
import {
  isStrongPassword,
  getApiUrl,
  getVerifier,
  limits,
  atRecordsLimits,
} from "../lib/utils";

import { getUserData } from "../lib/userData";

import { getTOTP } from "../lib/totp";
import { copyToClipboard } from "../lib/copyToClipboard";

import ItemModalFieldNav from "./itemModalFieldNav";

import ItemModal from "./itemModal";

// import PlanLimitsReachedModal from "./planLimitsReachedModal";

// import UpgradeModal from "./upgradeModal";


import Eye from "./eye";
import GeneratePasswordModal from "./generatePasswordModal";

import PasswordModalUrl from "./passwordModalUrl";

function drawTotpCircle() {
  const sec = new Date().getTime() / 1000;
  const fract = Math.ceil(((sec % 30) * 10) / 3);
  document.querySelectorAll(".totp_circle").forEach((e) => {
    // e.style.background = `conic-gradient(#c4c4c4 ${fract}%, #e7e7ee 0)`;
    e.style.background = `conic-gradient(var(--totp-circle-fg) ${fract}%, var(--totp-circle-bg) 0)`;
    //    e.style.background = `conic-gradient(rgba(27, 27, 38, 0.235) ${fract}%, rgba(27, 27, 38, 0.1) 0)`;
    // e.style.background = `(conic-gradient(red ${fract}%, grey 0)`;
  });
  if (Math.floor(sec % 30) == 0) {
    totpTimerListeners.forEach((f) => f());
  }
}

function startCopiedTimer() {
  setTimeout(() => {
    document
      .querySelectorAll(".copied")
      .forEach((e) => (e.style.display = "none"));
  }, 1000);
}

setInterval(drawTotpCircle, 1000);

let totpTimerListeners = [];

function totpTimerAddListener(f) {
  totpTimerListeners.push(f);
}

function totpTimerRemoveListener(f) {
  totpTimerListeners = totpTimerListeners.filter((e) => e !== f);
}

function PasswordModal(props) {

  const timerEvent = () => {
    showOTP();
  };

  if (!props.show) {
    totpTimerRemoveListener(timerEvent);
    return null;
  }

  totpTimerAddListener(timerEvent);

  const limitedView = (props.args.safe.user_role == 'limited view');


  function itemToState(item) {
    let _url = "";
    let _secondaryUrl = "";
    let _totpSecret = "";

    if (item) {
      let urls = item.cleartext[3].trim().split('\x01');
      _url = urls[0];
      if (urls.length > 1) {
        _secondaryUrl = urls[1];
      }
      if (item.cleartext.length > 5) {
        _totpSecret = item.cleartext[5].toUpperCase();
      }
    }

    let _password = "";
    if (item) {
      if (limitedView) {
        _password = "* hidden *";
      } else {
        _password = item.cleartext[2];
      }
    }
    return { _url, _secondaryUrl, _totpSecret, _password }
  }

  /*
  let _url = "";
  let _secondaryUrl = "";
  let _totpSecret = "";

  if (props.args.item) {
    let urls = props.args.item.cleartext[3].trim().split('\x01');
    _url = urls[0];
    if (urls.length > 1) {
      _secondaryUrl = urls[1];
    }
    if (props.args.item.cleartext.length > 5) {
      _totpSecret = props.args.item.cleartext[5].toUpperCase();
    }
  }


  let _password = "";
  if (props.args.item) {
    if (limitedView) {
      _password = "* hidden *";
    } else {
      _password = props.args.item.cleartext[2];
    }
  }
*/


  const { _url, _secondaryUrl, _totpSecret, _password } = itemToState(props.args.item);


  const [edit, setEdit] = useState(props.args.item ? false : true);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState(props.args.item ? props.args.item.cleartext[1] : '');
  const [password, setPassword] = useState(_password);
  const [url, setUrl] = useState(_url);
  const [secondaryUrl, setSecondaryUrl] = useState(_secondaryUrl);
  const [forceTotp, setForceTotp] = useState(false);
  const [totpSecret, setTotpSecret] = useState(_totpSecret);
  const [showModal, setShowModal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [unamePwdWarning, setUnamePwdWarning] = useState("");
  const [urlWarning, setUrlWarning] = useState("");
  const [totpWarning, setTotpWarning] = useState("");
  const [newItemId, setNewItemId] = useState(null);

  /*

  const [isHidden, setIsHidden] = useState(document.visibilityState == "hidden");

    useEffect(() => {
  
      if (props.isHidden && edit) {
        console.log('save state')
      }
  
    }, [props.isHidden])


  useEffect(() => {
    console.log('initial document.visibilityState', document.visibilityState);

    document.addEventListener("visibilitychange", () => {
      console.log('onVisibilityChange', document.visibilityState);
      setIsHidden(document.visibilityState == "hideen");
    })

  }, [])

  */


  const queryClient = useQueryClient();

  const passwordAction = (args) => {
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          if (result.firstID) {
            setNewItemId(result.firstID);
            props.newItemInd(result.firstID);
          }
          // props.onClose(true, result.id);
          // props.onClose();

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

  const passwordMutation = useMutation({
    mutationFn: passwordAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
    },
  })

  const onShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const onEdit = () => {
    if (limitedView) {
      return;
    }

    setEdit(true);
    setForceTotp(false);
  };

  const onUsernameChange = (e) => {
    let unamePwdWarning = "";
    const maxLength = limits.MAX_USERNAME_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      unamePwdWarning = `Username max length is ${maxLength} chars, truncated`;
    }
    setUsername(newValue);
    setUnamePwdWarning(unamePwdWarning);
  };

  const onPasswordChange = (e) => {
    let unamePwdWarning = "";
    const maxLength = limits.MAX_PASSWORD_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      unamePwdWarning = `Password length is ${maxLength} chars, truncated`;
    }
    setPassword(newValue);
    setUnamePwdWarning(unamePwdWarning);
  };

  const onTotpSecretChange = (e) => {
    let totpWarning = "";
    const maxLength = limits.MAX_TOTP_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      // totpWarning = `OTP length is ${maxLength} chars, truncated`;   // I'll do it later...
    }
    setTotpSecret(newValue.toUpperCase());
    setTotpWarning(totpWarning);
  };

  const onUrlChange = (e) => {
    let urlWarning = "";
    const maxLength = limits.MAX_URL_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      urlWarning = `URL length is ${maxLength} chars, truncated`;
    }

    setUrl(newValue);
    setUrlWarning(urlWarning);
  };

  const onSecondaryUrlChange = (e) => {
    let urlWarning = "";
    const maxLength = limits.MAX_URL_LENGTH;
    let newValue = e.target.value;

    if (newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
      urlWarning = `URL length is ${maxLength} chars, truncated`;
    }
    setSecondaryUrl(newValue.trim());
    setUrlWarning(urlWarning);
  };

  const onClose = () => {
    totpTimerRemoveListener(timerEvent);
    props.onClose();
  };

  const onSubmit = (title, note) => {

    let _url = url;
    let _secondaryUrl = secondaryUrl.trim();

    if (_secondaryUrl.length) {
      _url = [url, _secondaryUrl].join('\x01');
    }

    const pData = [
      title,
      username,
      password,
      _url,
      note,
    ];

    const _totpSecret = totpSecret
      .replace(/-/g, "")
      .replace(/ /g, "");

    if (_totpSecret.length > 0) {
      pData.push(_totpSecret);
    }

    const options = {};

    const safe = props.args.safe;

    const aesKey = safe.bstringKey;
    const SafeID = safe.id;

    let folderID = 0;
    if (props.args.item) {
      folderID = props.args.item.folder;
    } else if (props.args.folder.safe) {
      folderID = props.args.folder.id;
    }

    /*
    const folder = this.props.args.folder;
    const [aesKey, SafeID, folderID] = folder.safe
      ? [folder.safe.bstringKey, folder.safe.id, folder.id]
      : [folder.bstringKey, folder.id, 0];
*/
    const eData = passhubCrypto.encryptItem(pData, aesKey, options);
    const data = {
      verifier: getVerifier(),
      vault: SafeID,
      folder: folderID,
      encrypted_data: eData,
    };
    if (props.args.item) {
      data.entryID = props.args.item._id;
    } else if (newItemId) {
      data.entryID = newItemId;
    }

    passwordMutation.mutate({ url: 'items.php', args: data })

  };


  /*
    const showOTP1 = () => {
      if (
        edit ||
        !props.show ||
        !props.args.item ||
        props.args.item.cleartext.length < 6
      ) {
        return;
      }
  
      const secret = props.args.item.cleartext[5];
      if (secret.length > 0) {
        const s = secret.replace(/\s/g, "").toUpperCase();
        try {
          const secretBytes = new Uint8Array(base32.decode.asBytes(s));
  
          window.crypto.subtle
            .importKey(
              "raw",
              secretBytes,
              { name: "HMAC", hash: { name: "SHA-1" } },
              false,
              ["sign"]
            )
            .then((key) => getTOTP(key))
            .then((six) => {
              document
                .querySelectorAll(".totp_digits")
                .forEach((e) => (e.innerText = six));
            });
        } catch (err) {
          document
            .querySelectorAll(".totp_digits")
            .forEach((e) => (e.innerText = "invalid TOTP secret"));
        }
      }
    };
  
    */

  const showOTP = () => {
    if (
      edit ||
      !props.show ||
      !props.args.item ||
      (totpSecret == "")
      //      props.args.item.cleartext.length < 6
    ) {
      return;
    }
    //    const secret = props.args.item.cleartext[5];
    const secret = totpSecret;

    if (secret.length > 0) {

      getTOTP(secret)
        .then((six) => {
          document
            .querySelectorAll(".totp_digits")
            .forEach((e) => (e.innerText = six));
        })
        .catch((err) => {
          document
            .querySelectorAll(".totp_digits")
            .forEach((e) => (e.innerText = "invalid TOTP secret"));

        })
    }
  };


  if (typeof props.args.item == "undefined") {
    if (atRecordsLimits()) {

      return (
        <UpgradeModal
          show={props.show}
          accountData={getUserData()}
          onClose={props.onClose}
        ></UpgradeModal>
      );

      /*        
              return (
                <PlanLimitsReachedModal
                  show={this.props.show}
                  onClose={this.props.onClose}
                ></PlanLimitsReachedModal>
              );
      */
    }
  }

  let passwordType = showPassword ? "text" : "password";

  /*
  const path = this.props.args.folder
    ? this.props.args.folder.path.join(" > ")
    : [];
  */

  const { strongPassword, reason } = isStrongPassword(password);

  const passwordStrength = strongPassword ? (
    <span className="colored" style={{ opacity: "1" }}>
      <span style={{ margin: "0 .3em" }}>&#183;</span>
      Strong
    </span>
  ) : (
    <span style={{ color: "#EB6500", opacity: "1" }}>
      <span style={{ margin: "0 .3em" }}>&#183;</span>
      Weak: {reason}
    </span>
  );

  const passwordBackground =
    !edit && password.length && !strongPassword
      ? "weakPassword"
      : "";

  if (
    props.args.item &&
    props.args.item.cleartext[5] &&
    !edit
  ) {
    showOTP();
  }

  let totp = "";

  if (!edit) {
    if (totpSecret != "") {
      totp = (
        <div
          className="itemModalField"
          style={{ marginBottom: 32, position: "relative" }}
          onClick={() => {
            copyToClipboard(
              document.querySelector(".totp_digits").innerText
            );
            document.querySelector("#totp_copied").style.display = "flex";
            startCopiedTimer();
          }}
        >
          <ItemModalFieldNav
            margin27
            copy={!edit}
            name="One-time passcode (TOTP)" />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="totp_circle"></div>
            <div className="totp_digits"></div>
          </div>
          <div className="copied" id="totp_copied">
            <div style={{ margin: "0 auto", color: "var(--link-color)" }}>Copied &#10003;</div>
          </div>
        </div>
      );
    }
  } else {
    if (
      (props.args.item && props.args.item.cleartext.length > 5) ||
      forceTotp
    ) {
      totp = (
        <React.Fragment>
          <div
            className="itemModalField"
            style={{ marginBottom: 32 }}
            onClick={() => {
              if (!edit) {
                copyToClipboard(
                  document.querySelector(".totp_digits").innerText
                );
              }
            }}
          >
            {((totpSecret.length > 0) || true) ? (
              <ItemModalFieldNav
                copy={!edit}
                name="One-time passcode (TOTP) secret key"
              />
            ) : (
              ""
            )}
            <input
              onChange={onTotpSecretChange}
              spellCheck={false}
              value={totpSecret}
            ></input>
          </div>
          {unamePwdWarning &&
            unamePwdWarning.length > 0 && (
              <div style={{ color: "red" }}>{unamePwdWarning}</div>
            )}
        </React.Fragment>
      );
    } else {
      totp = (
        <div
          className="itemModalPlusField"
          onClick={() => setForceTotp(true)}
        >
          <svg width="24" height="24" fill="none">
            <use href="#f-add"></use>
          </svg>
          <span style={{ marginLeft: 6 }}>Add one-time passcode (TOTP)</span>
        </div>
      );
    }
  }

  function onHistoryItemChange(item) {

    const { _url, _secondaryUrl, _totpSecret, _password } = itemToState(item);
    setUsername(item.cleartext[1]);
    setPassword(_password);
    setUrl(_url);
    setSecondaryUrl(_secondaryUrl);
    setTotpSecret(_totpSecret);
  }

  return (
    <ItemModal
      show={props.show}
      args={props.args}
      onClose={onClose}
      onCloseSetFolder={props.onCloseSetFolder}
      onEdit={onEdit}
      edit={edit}
      onSubmit={onSubmit}
      onHistoryItemChange={onHistoryItemChange}
      errorMsg={errorMsg}
      limitedView={limitedView}
      key="pwm-item-modal"
    >

      <div
        className="itemModalField upper"
        style={{ position: "relative" }}
        onClick={() => {
          if (!edit) {
            copyToClipboard(username);
            document.querySelector("#username_copied").style.display = "flex";
            startCopiedTimer();
          }
        }}
      >
        <ItemModalFieldNav
          copy={!edit}
          margin27
          name="Username"
          htmlFor="username"
        />
        <div>
          <input
            id="username"
            className="lp"
            onChange={onUsernameChange}
            readOnly={!edit}
            spellCheck={false}
            autoComplete="off"
            value={username}
          ></input>
        </div>
        <div className="copied" id="username_copied">
          <div>Copied &#10003;</div>
        </div>
      </div>

      <div
        className={`itemModalField lower ${passwordBackground}`}
        style={{
          position: "relative",
          display: "flex",
          marginBottom: edit ? 0 : 32,
        }}
      >
        <div
          style={{ flexGrow: 1 }}
          onClick={() => {
            if (!edit) {
              copyToClipboard(password);
              document.querySelector("#password_copied").style.display =
                "flex";
              startCopiedTimer();
            }
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="label">
              <label htmlFor="password">
                Password
                {password.length ? passwordStrength : ""}
              </label>
            </div>
            {!edit && (
              <div>
                <span className="iconTitle">Copy</span>
                <svg width="24" height="24" fill="none" stroke="#1b1b26">
                  <use href="#f-copy"></use>
                </svg>
              </div>
            )}
          </div>
          <div>
            <input
              className="lp"
              id="password"
              type={passwordType}
              onChange={onPasswordChange}
              readOnly={!edit}
              spellCheck={false}
              autoComplete="off"
              value={password}
            ></input>
          </div>
          <div className="copied" id="password_copied">
            <div style={{ margin: "0 auto", color: "var(--link-color)" }}>Copied &#10003;</div>
          </div>
        </div>
        <Eye onClick={onShowPassword} hide={!showPassword} />
      </div>

      {unamePwdWarning && unamePwdWarning.length > 0 && (
        <div style={{ color: "red" }}>{unamePwdWarning}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {edit ? (
          <div
            onClick={() =>
              setShowModal("GeneratePasswordModal")
            }
            style={{
              margin: "8px 0 16px",
              padding: "8px 0 15px",
              fontSize: "14px",
              cursor: "pointer",
              color: "var(--link-color)"
            }}
          >
            <svg width="24" height="24" fill="none">
              <use href="#f-shieldShevron"></use>
            </svg>
            <span
              style={{
                marginLeft: "6px",
                display: "inline-block",
              }}
            >
              Generate password
            </span>
          </div>
        ) : (
          <div></div>
        )}

        <div
          onClick={onShowPassword}
          style={{
            textAlign: "right",
            margin: "8px 0 16px",
            padding: "8px 0 15px",
            fontSize: "14px",
            cursor: "pointer",
            display: "none",
            color: "var(--link-color)"
          }}
        >
          <svg width="21" height="21" fill="none">
            <use href="#f-eye"></use>
          </svg>
          <span
            style={{
              marginLeft: "6px",
              width: "6.5rem",
              display: "inline-block",
            }}
          >
            {showPassword ? "Hide" : "Show"} Password
          </span>
        </div>
      </div>

      <PasswordModalUrl
        item={props.args.item}
        edit={edit}
        url={url}
        secondaryUrl={secondaryUrl}
        onUrlChange={onUrlChange}
        onSecondaryUrlChange={onSecondaryUrlChange}
        showSecondaryUrl={true}
      ></PasswordModalUrl>

      {urlWarning && urlWarning.length > 0 && (
        <div style={{ color: "red" }}>{urlWarning}</div>
      )}

      {totp}
      <GeneratePasswordModal
        show={showModal == "GeneratePasswordModal"}
        onClose={(dummy, newPassword) => {
          setShowModal("");
          if (newPassword) {
            setPassword(newPassword);
          }
        }}
      ></GeneratePasswordModal>

    </ItemModal>
  );
}

export default PasswordModal;
