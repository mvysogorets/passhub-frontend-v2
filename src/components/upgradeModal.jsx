import { useState } from "react";
import axios from "axios";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ItemModalFieldNav from "./itemModalFieldNav";
import { getApiUrl, getVerifier, totalStorage, totalRecords, atStorageLimits, atRecordsLimits, humanReadableFileSize } from "../lib/utils";

import ModalCross from "./modalCross";

import { getAccountData } from "../lib/userData";

function UpgradeModal(props) {

  if (!props.show) {
    return null;
  }

  const [discount, setDiscount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showDiscountInput = false;
  /*
    this.setState({
      name: "",
      email: "",
      message: "",
      errorMsg: "",
      discount: "",
      showDiscountInput: false,
  
  
    onDiscountChange = (e) => {
      setDiscount(e.target.value);
      setErrorMsg("");
  
  //      showDiscountInput: true,
    };
  */


  const sizeLimits = (size) => {
    if (size == 0) return "0";
    if (size < 1024) return `${size} B`;
    const i = Math.floor(Math.log(size) / Math.log(1024));
    let num = (size / Math.pow(1024, i));
    const round = Math.round(num);
    //      num = round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round
    return `${round} ${'KMGTPEZY'[i - 1]}B`;
  };

  const accountData = getAccountData();

  return (
    <Modal
      show={props.show}
      onHide={props.onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle">
        <div className="h2">Upgrade to Premium</div>
      </div>

      <Modal.Body className="edit" style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "32px" }}>
          {atStorageLimits() && (
            <p style={{ color: "red" }}>
              Maximum storage size for your {accountData.plan.toUpperCase()} plan is {sizeLimits(props.accountData.maxStorage)}. You have alreaady used {humanReadableFileSize(totalStorage())}.
            </p>
          )}
          {atRecordsLimits() && (
            <p style={{ color: "red" }}>
              Maximum number of passwords, notes, and bank card records for your{" "}
              <b>{accountData.plan.toUpperCase()}</b> plan is <b>{props.accountData.maxRecords}</b> records. You
              already have <b>{totalRecords()}</b> records.
            </p>
          )}

          {!atStorageLimits() && !atRecordsLimits() && (
            <p>
              Your <b>{accountData.plan.toUpperCase()}</b> account is limited to {accountData.maxRecords} records,{" "}
              {sizeLimits(accountData.maxStorage)} storage, and&nbsp;{sizeLimits(accountData.maxFileSize)} file size.
            </p>
          )}
          <p>Get <b>PREMIUM</b> plan for:</p>
          <ul>
            <li>unlimited records</li>
            <li>unlimited sharing</li>
            <li>{sizeLimits(accountData.upgrade.maxStorage)} of storage space</li>
            <li>{sizeLimits(accountData.upgrade.maxFileSize)} max file size</li>
          </ul>
          <p>for only</p>
          <div>
            <span style={{ fontSize: "36px", fontWeight: 700 }}> ${(accountData.upgrade.price / 12).toFixed(2)}</span><b> /month</b>.
          </div>
          <div style={{ color: "grey" }}>
            ${accountData.upgrade.price} billed annualy
          </div>
        </div>

        {showDiscountInput && (
          <div
            className="itemModalField"
            style={{
              display: "flex",
              position: "relative",
              marginBottom: 32,
            }}
          >
            <div style={{ flexGrow: 1, overflow: "hidden" }}>
              <ItemModalFieldNav
                name="Discount code"
                htmlFor="discount-code"
              />
              <div>
                <input
                  id="discount-code"
                  onChange={onDiscountChange}
                  spellCheck={false}
                  value={discount}
                ></input>
              </div>
            </div>
            <Button variant="primary" type="button" onClick={onApply}>
              Apply
            </Button>
          </div>
        )}
        {false && !showDiscountInput && (
          <div id="price-after-discount">
            You price tag after discount is{" "}
            <span
              style={{
                color: "red",
                fontSize: "larger",
                fontWeight: "bolder",
              }}
            ></span>
          </div>
        )}

        {errorMsg.length > 0 && (
          <p style={{ color: "red" }}>{errorMsg}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            window.open("payments/checkout.php", "passhub_payment");
            props.onClose();
          }}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UpgradeModal;


/*
  onApply = (e) => {
    if (discount.trim().length == 0) {
      return;
    }

    const data = {
      verifier: getVerifier(),
      code: discount,
    };

    axios
      .post(`${getApiUrl()}payments/discount.php`, data)
      .then((reply) => {
        const result = reply.data;
        if (result.status === "Ok") {
          this.setState({ showDiscountInput: false });
          document.querySelector("#price-after-discount span").innerText =
            "$" + result.total;
          return;
        }
        if (result.status === "Wrong discount code") {
          this.setState({ errorMsg: "Wrong discount code. Please try again" });
          return;
        }

        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        if (result.status === "expired") {
          window.location.href = "expired.php";
          return;
        }
        this.setState({ errorMsg: result.status });
        return;
      })
      .catch((err) => {
        console.log("err ", err);
        this.setState({ errorMsg: "Server error. Please try again later" });
      });
  };

*/
