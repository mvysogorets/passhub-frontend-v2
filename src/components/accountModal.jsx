import React, { useState, useEffect } from "react";
import axios from "axios";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ModalCross from "./modalCross";

import InputField from "./inputField";

import Slider from "rc-slider";
import "rc-slider/assets/index.css";

import { getUserData, getAccountData, updateInactivityTimeout, clearAutorenew } from "../lib/userData";
import { getApiUrl, getVerifier } from "../lib/utils";

import knot1 from '../assets/knot1.svg';
import knot2 from '../assets/knot2.svg';
import knot3 from '../assets/knot3.svg';



function AccountModal(props) {

  if (!props.show) {
    return null;
  }

  const _inactivityTimeout = getAccountData().desktop_inactivity;

  const [inactiveTimeout, setInactiveTimeout] = useState(_inactivityTimeout);
  const [rerenderHack, setRerenderhack] = useState(1);


  const accountData = getAccountData();

  const onUpgrade = (e) => {
    props.onClose(e, "upgrade");
  };

  const onMailClick = () => {
    if (!accountData.business) {
      props.onClose("dummy", "email");
    }
  };

  const onSliderChange = (value) => {
    setInactiveTimeout(value * 60);
    updateInactivityTimeout(value * 60);

    axios.post(`${getApiUrl()}account.php`, {
      verifier: getVerifier(),
      operation: "setInactivityTimeout",
      value: value * 60,
    })
      .then((reply) => {
        const result = reply.data;
        if (result.status === "Ok") {
          //          updateInactivityTimeout(result.desktop_inactivity);
          //          setInactiveTimeout(result.desktop_inactivity);
          return;
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
      });
  };

  const onRadioChange = (e) => {
    let inactivity = 4 * 60;
    if (e.target.value == "1 hour") {
      inactivity = 1 * 60;
    } else if (e.target.value == "15 min") {
      inactivity = 15;
    }
    onSliderChange(inactivity);
  }

  const cancelSubscription = () => {
    props.accountOperation({
      verifier: getVerifier(),
      operation: "cancelSubscription",
    });

    axios.post(`${getApiUrl()}account.php`, {
      verifier: getVerifier(),
      operation: "cancelSubscription",
    })
      .then((reply) => {
        const result = reply.data;
        if (result.status === "Ok") {
          if (typeof result.autorenew == 'undefined') {
            clearAutorenew(result);
            setRerenderhack(rerenderHack + 1);
          }
          return;
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
      });
  }
  const marks = { 15: "15 min", 60: "1 hour", 240: "4 hours" };

  let slider_position = 240;
  const { desktop_inactivity } = accountData;
  if (desktop_inactivity) {
    if (desktop_inactivity < 50 * 60) {
      slider_position = 15;
    } else if (desktop_inactivity < 110 * 60) {
      slider_position = 60;
    }
  }

  const showUpgrade =
    accountData.plan &&
    (accountData.plan.toUpperCase().startsWith("FREE"));

  let accountType = "";

  if (!accountData.business) {
    if (showUpgrade) {
      accountType = accountData.plan.toUpperCase();
    } else {
      accountType = "PREMIUM"
    }
  }

  let premiumDiv = null;

  if (typeof accountData.expires == "number") {
    let premiumComment = '';
    if (accountData.autorenew) {
      premiumComment = 'Subscription next auto-renewal date';
    } else {
      premiumComment = 'expires at';
    }

    const expiredAt = new Date(accountData.expires * 1000).toISOString().substring(0, 10);

    premiumDiv = (
      <div style={{ padding: "1em 9px 9px 30px", marginBottom: 35, borderRadius: "12px", border: "1px solid var(--account-block-border)" }}>
        <div>{premiumComment} <span style={{ marginLeft: "8px" }}><b>{expiredAt}</b></span></div>

        {(accountData.autorenew || accountData.receipt_url) && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "2em;", marginTop: "2em" }}>
            <div>
              <div>
                {accountData.receipt_url && (
                  <a href={accountData.receipt_url} style={{ color: "var(--link-color)" }} target='_blank'>Your latest payment receipt</a>
                )}
              </div>
              {/* 
              <div>
                {accountData.receipt_url && (
                  <a href="/payments/billing.php" style={{ color: "var(--link-color)" }} target='_blank'>stripe billing page</a>
                )}
              </div>
                */}
              <div>
                {accountData.autorenew && (
                  <a href="#" onClick={() => {
                    window.open("payments/update_card.php", "passhub_payment");
                    props.onClose();
                  }}
                    style={{ color: "var(--link-color)" }} > Update payment card data</a>
                )}
              </div>
            </div>

            <div>
              {accountData.autorenew && (
                <button className="btn btn-outline-danger" onClick={cancelSubscription}>Cancel auto-renew</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  let knot = knot3;
  if ((inactiveTimeout >= 1000) && (inactiveTimeout < 2 * 60 * 60)) {
    knot = knot2;
  } if (inactiveTimeout < 1000) {
    knot = knot1;
  }


  function inactivityChecked1(choice) {

    if (choice.upper && (choice.upper >= inactiveTimeout)) {
      if (!choice.lower) {
        return true;
      }
      return (choice.lower <= inactiveTimeout);
    }
    if (choice.upper && (choice.upper <= inactiveTimeout)) {
      return false;
    }
    return (choice.lower <= inactiveTimeout);
  }

  function inactivityChecked(choice) {
    console.log("choice");
    console.log(choice);
    console.log("inactiveTimeout", inactiveTimeout);

    console.log(inactivityChecked1(choice) ? "true" : "false");
    return inactivityChecked1(choice);
  }



  return (
    <Modal
      show={props.show}
      onHide={props.onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle">
        <div className="h2">Account settings</div>
      </div>

      <Modal.Body style={{ marginBottom: "24px" }}>

        {!accountData.business && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ marginBottom: 37 }}>
              Account type:{" "}
              <b>{accountType}</b>
            </div>
            {showUpgrade && (
              <Button variant="primary" onClick={onUpgrade}>
                Upgrade to Premium
              </Button>
            )}
          </div>
        )}


        {!accountData.business && (accountData.plan.toUpperCase() == "PREMIUM") && premiumDiv}

        <div style={{ /*display: "flex",*/ display: "none", justifyContent: "space-between", flexWrap: "wrap", rowGap: 16, margin: "0 30px 37px 30px" }}>
          <div style={{ margin: "0 0 12px 0" }}>Inactivity&nbsp;timeout</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "65px" }} >
            <img src={knot} alt="knot" style={{ height: "120px", opacity: "50%" }}></img>
            <div className="inactivity-radio-div">
              {[{ duration: 15, txt: "15 min", upper: 1000 }, { duration: 60, txt: "1 hour", upper: 2 * 60 * 60, lower: 1000 }, { duration: 4 * 60, txt: "4 hours", lower: 2 * 60 * 60 }].map((choice) =>
              (
                <div>
                  <label>
                    <svg
                      width="22"
                      height="22"
                      fill="none"
                      style={{ marginRight: "14px" }}
                    >
                      <use
                        href={
                          inactivityChecked(choice)
                            ? "#f-radio-checked"
                            : "#f-radio"
                        }
                      ></use>
                    </svg>

                    <input type="radio" name="inactivity" value={choice.txt}
                      onChange={onRadioChange}
                      checked={inactivityChecked(choice)}
                    />
                    {choice.txt}
                  </label>
                </div>
              ))}
            </div>
          </div>

        </div>


        <div style={{ marginBottom: "64px", padding: "0 32px", display: "none" }}>
          <Slider
            value={slider_position}
            min={15}
            max={240}
            marks={marks}
            step={null}
            onChange={onSliderChange}
            trackStyle={{ background: "#00BC62" }}
            handleStyle={{ borderColor: "#00BC62" }}
          ></Slider>
        </div>
        {accountData.email.length ? (
          <InputField
            label="Email"
            readonly
            padding="11px 30px"
            value={accountData.email}
            onClick={onMailClick}
          >
            {!accountData.business && (
              <div>
                <span className="iconTitle" style={{ marginRight: 0 }}>Edit</span>
                <svg
                  width="24"
                  height="24"
                  title="Edt"
                  style={{ opacity: "0.5", stroke: "black", fill: "none", display: "none" }}
                >
                  <use href="#f-edit"></use>
                </svg>
              </div>
            )}
          </InputField>
        ) : (
          <div
            className="itemModalField"
            style={{
              marginBottom: 62,
              position: "relative",
              background: "#E6F8EF",
              cursor: "pointer",
              padding: "11px 30px"
            }}
            onClick={onMailClick}
          >
            <div
              style={{
                color: "var(--link-color)",
                display: "table",

              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <svg width="24" height="24" style={{ marginRight: "10px" }}>
                  <use href="#f-add"></use>
                </svg>
                Add email
              </div>
              <div style={{ fontSize: "14px" }}>
                an email is needed so that other users can share safes with
                you, as well as to subscribe to news and updates
              </div>
            </div>
          </div>
        )}
        <div
          onClick={() => {
            props.onClose("dummy", "delete account");
          }}
        >
          <div
            style={{
              color: "var(--danger-color)",
              marginTop: "32px",
              cursor: "pointer",
            }}
          >
            <svg width="24" height="24" style={{ marginRight: "8px" }}>
              <use href="#f-trash-red"></use>
            </svg>
            Delete Account
          </div>
          <div style={{ color: "var(--body-color)", opacity: 0.7, fontSize: "14px" }}>
            Once deleted, your records, files, safes and folders cannot be
            recovered
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AccountModal;
