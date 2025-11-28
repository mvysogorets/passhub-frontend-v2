import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

import axios from "axios";

import * as passhubCrypto from "../lib/crypto";
import { copyToClipboard, startCopiedTimer } from "../lib/copyToClipboard";
import { getApiUrl, getVerifier, atRecordsLimits } from "../lib/utils";
import ItemModalFieldNav from "./itemModalFieldNav";
import Eye from "./eye";

import ItemModal from "./itemModal";
// import PlanLimitsReachedModal from "./planLimitsReachedModal";
// import UpgradeModal from "./upgradeModal";
import { ButtonGroup } from "react-bootstrap";

// import { findRenderedDOMComponentWithClass } from "react-dom/cjs/react-dom-test-utils.production.min";

const maxCardholderNameLength = 40; // ISO IEC 7813: 2 - 26 actually including spaces

const monthNumbers = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

function luhnLength(number) {
  if (number.charAt(0) === "4") {
    // visa
    return 16;
  }

  const d2 = parseInt(number.substring(0, 2));

  if (d2 == 34 || d2 == 37) {
    //amex
    return 15;
  }

  if (d2 >= 51 && d2 <= 55) {
    //mastercard (Diners Club US, Can 54, 55 )
    return 16;
  }

  const d4 = parseInt(number.substring(0, 4));
  if (d4 >= 2200 && d4 <= 2204) {
    //mir
    return 16;
  }

  if (d4 >= 2221 && d4 <= 2720) {
    //mastercard
    return 16;
  }

  return 19;
}

const twentyYears = [];
let thisYear = new Date();
thisYear = thisYear.getFullYear();
for (let i = 0; i < 20; i++) {
  twentyYears.push(thisYear + i);
}

const two = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];

// https://gist.github.com/DiegoSalazar/4075533

function isValidCardNumber(aNumber) {
  // Accept only digits, dashes or spaces

  if (/[^0-9-\s]+/.test(aNumber)) return false;
  const value = aNumber.replace(/\D/g, "");
  if (value.length < 8 || value.length > 19) {
    return false;
  }

  const ll = luhnLength(value);
  if (ll > 0 && value.length != ll) {
    return false;
  }

  let sum = 0,
    even = false;

  for (let n = value.length - 1; n >= 0; n--) {
    let c = value.charAt(n),
      ci = "0123456789".indexOf(c);
    sum += even ? two[ci] : ci;
    even = !even;
  }

  return sum % 10 == 0;
}

function BankCardModal(props) {

  if (!props.show) {
    return null;
  }

  let _ccNumber = "";
  let _ccName = "";
  let _ccExpMonth = "";
  let _ccExpYear = "";
  let _ccCSC = "";
  let _edit = true;

  if (props.args.item) {
    _ccNumber = props.args.item.cleartext[3];
    _ccName = props.args.item.cleartext[4];
    _ccExpMonth = props.args.item.cleartext[5];
    _ccExpYear = props.args.item.cleartext[6];
    _ccCSC = props.args.item.cleartext[7];
    _edit = false;
  }

  const [edit, setEdit] = useState(_edit);
  const [ccNumber, setCCNumber] = useState(_ccNumber);
  const [ccName, setCCName] = useState(_ccName);
  const [ccExpMonth, setCCExpMonth] = useState(_ccExpMonth);
  const [ccExpYear, setCCExpYear] = useState(_ccExpYear);
  const [ccCSC, setCCCSC] = useState(_ccCSC);
  const [errorMsg, setErrorMsg] = useState("");
  const [hideCSC, setHideCSC] = useState(true);
  const [hideCardNumber, setHideCardNumber] = useState(true);
  const [newItemId, setNewItemId] = useState(null);

  const queryClient = useQueryClient();

  const cardAction = (args) => {
    //     console.log('card Action: url', args.url,  'args', args.args);
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          if (result.firstID) {
            setNewItemId(result.firstID);
            props.newItemInd(result.firstID);
          }

          //props.onClose(true, result.id);
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

  const cardMutation = useMutation({
    mutationFn: cardAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
    },
  })

  const onEdit = () => {
    setEdit(true);
  };

  const onClose = () => {
    props.onClose();
  };

  const toggleCSC = () => {
    setHideCSC(!hideCSC);
  };

  const toggleCardNumber = () => {
    setHideCardNumber(!hideCardNumber);
  };

  const onSubmit = (title, note) => {
    const pData = [
      "card",
      title,
      note,
      ccNumber,
      ccName,
      ccExpMonth,
      ccExpYear,
      ccCSC,
    ];

    const safe = props.args.safe;

    const aesKey = safe.bstringKey;
    const SafeID = safe.id;

    let folderID = 0;
    if (props.args.item) {
      folderID = props.args.item.folder;
    } else if (props.args.folder.safe) {
      folderID = props.args.folder.id;
    }
    const eData = passhubCrypto.encryptItem(pData, aesKey, { version: 5 });
    const data = {
      verifier: getVerifier(),
      vault: SafeID,
      folder: folderID,
      encrypted_data: eData,
    }

    if (props.args.item) {
      data.entryID = props.args.item._id;
    } else if (newItemId) {
      data.entryID = newItemId;
    }

    cardMutation.mutate({ url: 'items.php', args: data })
  };

  const onCscChange = (e) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.substring(0, 4);
    setCCCSC(value);
    setErrorMsg("");
  };

  const onNumberChange = (e) => {
    let value = e.target.value;

    value = value.replace(/\D/g, "");

    const numLength = luhnLength(value);
    value = value.substring(0, numLength);
    if (numLength == 15) {
      //amex
      if (value.length > 10) {
        value = value.substring(0, 10) + " " + value.substring(10);
      }
      if (value.length > 4) {
        value = value.substring(0, 4) + " " + value.substring(4);
      }
    } else {
      const quads = Math.floor((value.length - 1) / 4);
      for (let position = quads * 4; position > 0; position -= 4) {
        value = value.substring(0, position) + " " + value.substring(position);
      }
    }
    setCCNumber(value);
    setErrorMsg("");
  };

  const onNameChange = (e) => {
    const value = e.target.value.substring(0, maxCardholderNameLength);
    setCCName(value);
    setErrorMsg("");
  };

  const onMonthSelect = (key) => {
    setCCExpMonth(key);
    setErrorMsg("");
  }

  const onYearSelect = (key) => {
    setCCExpYear(key);
    setErrorMsg("");
  }

  {/*
    if (typeof this.props.args.item == "undefined") {
      if (atRecordsLimits()) {
        return (
          <UpgradeModal
            show={this.props.show}
            accountData={getUserData()}
            onClose={this.props.onClose}
          ></UpgradeModal>
        );
      }
    }
  */}


  let expDate = "";
  if (ccExpMonth !== "" && ccExpYear !== "") {
    expDate = `${ccExpMonth}/${ccExpYear.slice(-2)}`;
  }
  /*
  const path = this.props.args.folder
    ? this.props.args.folder.path.join(" > ")
    : [];
*/
  return (
    <ItemModal
      show={props.show}
      args={props.args}
      onClose={props.onClose}
      onCloseSetFolder={props.onCloseSetFolder}
      onEdit={onEdit}
      onSubmit={onSubmit}
      edit={edit}
      errorMsg={errorMsg}
    >
      <div
        className="itemModalField"
        style={{
          marginBottom: 32,
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{ flexGrow: 1 }}
          onClick={() => {
            if (!edit) {
              const cc_number = ccNumber.replace(/\D/g, "");
              copyToClipboard(cc_number);
              document.querySelector("#ccnumber_copied").style.display = "flex";
              startCopiedTimer();
            }
          }}
        >
          <ItemModalFieldNav
            copy={!edit}
            name="Card number"
            htmlFor="cc-number"
          />
          <div>
            <input
              id="cc-number"
              onChange={onNumberChange}
              readOnly={!edit}
              spellCheck={false}
              value={ccNumber}
              autoComplete="off"
              placeholder={edit ? "0000 0000 0000 0000" : ""}
            ></input>
            <div className="copied" id="ccnumber_copied">
              <div>Copied &#10003;</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-exp-csc">
        <div
          className="itemModalField"
          style={{
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            overflow: "visible",
            width: "100%",
          }}
        >
          <div className="date-selector">
            <ItemModalFieldNav name="Expiration date" />
            {edit ? (
              <ButtonGroup>
                <DropdownButton
                  variant="outline-secondary"
                  size="sm"
                  id="expMonth"
                  title={
                    ccExpMonth === ""
                      ? "Month"
                      : ccExpMonth
                  }
                  onSelect={onMonthSelect}
                >
                  {[
                    "01",
                    "02",
                    "03",
                    "04",
                    "05",
                    "06",
                    "07",
                    "08",
                    "09",
                    "10",
                    "11",
                    "12",
                  ].map((m) => (
                    <Dropdown.Item key={`month${m}`} eventKey={m}>{m}</Dropdown.Item>
                  ))}
                </DropdownButton>

                <DropdownButton
                  variant="outline-secondary"
                  size="sm"
                  id="expYear"
                  title={
                    ccExpYear === ""
                      ? "Year"
                      : ccExpYear
                  }
                  onSelect={onYearSelect}
                >
                  {twentyYears.map((y) => (
                    <Dropdown.Item key={`year${y}`} eventKey={y}>{y}</Dropdown.Item>
                  ))}
                </DropdownButton>
              </ButtonGroup>
            ) : (
              expDate
            )}
          </div>
        </div>
        <div
          className="itemModalField"
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{ flexGrow: 1 }}
            onClick={() => {
              if (!edit) {
                copyToClipboard(ccCSC);
                document.querySelector("#cccsc_copied").style.display =
                  "flex";
                startCopiedTimer();
              }
            }}
          >
            <ItemModalFieldNav
              name="Security code"
              htmlFor="cc-csc"
              copy={!edit}
            />
            <div style={{ display: "flex" }}>
              <input
                id="cc-csc"
                type={hideCSC ? "password" : "text"}
                placeholder={edit ? "000" : ""}
                readOnly={!edit}
                onChange={onCscChange}
                spellCheck={false}
                autoComplete="off"
                value={ccCSC}
              ></input>
              <div className="copied" id="cccsc_copied">
                <div>Copied &#10003;</div>
              </div>
            </div>
          </div>
          <Eye onClick={toggleCSC} hide={hideCSC} />
        </div>
      </div>

      <div
        className="itemModalField"
        style={{ marginBottom: 32, position: "relative" }}
        onClick={() => {
          if (!edit) {
            copyToClipboard(ccName);
            document.querySelector("#ccname_copied").style.display = "flex";
            startCopiedTimer();
          }
        }}
      >
        <ItemModalFieldNav
          copy={!edit}
          name="Name on card"
          htmlFor="cc-name"
        />
        <div>
          <input
            id="cc-name"
            onChange={onNameChange}
            readOnly={!edit}
            spellCheck={false}
            autoComplete="off"
            value={ccName}
          ></input>
          <div className="copied" id="ccname_copied">
            <div>Copied &#10003;</div>
          </div>
        </div>
      </div>
    </ItemModal>
  );
}

export default BankCardModal;

