// import React, { useState, useEffect, useRef } from 'react';

import ThemeMenu from "./themeMenu";
import { contextMenu, Menu, Item } from "react-contexify";

import { getApiUrl, getVerifier, humanReadableFileSize, logMeOut } from "../lib/utils";

import { getUserData } from "../lib/userData";


function perCent(part, all) {
  if (part == 0) {
    return 0;
  }

  let result = Math.floor((part * 100) / all);
  if (result < 2) {
    return 2;
  }
  if (result > 100) {
    return 100;
  }
  return result;
}

function AccountDropDown(props) {

  if (!props.show) {
    return null;
  }

  const handleBodyClick = (e) => {
    e.stopPropagation();
  };

  const handleOuterClick = () => {
    props.onClose();
  };

  const handleLogout = () => {
    logMeOut();
  };

  const handleMenuCommand = (e, cmd) => {
    e.stopPropagation();

    if (cmd == "theme") {

      e.preventDefault();
      contextMenu.show({ id: "theme-menu-id", event: e });
      return;
    }

    props.onClose();


    props.onMenuCommand(cmd);
  };

  const onUpgrade = () => {
    /*
    window.open("payments/checkout.php", "passhub_payment");
    this.props.onClose();
    */
    props.onMenuCommand("upgrade");
  };

  const accountData = getUserData();
  const nmenu = Array.isArray(props.nmenu) ? props.nmenu : [];

  const modalClasses = props.show ? "pmodal" : "pmodal d-none";

  const storage = (
    <b>
      {humanReadableFileSize(accountData.totalStorage ? accountData.totalStorage : 0)}
    </b>
  );
  const records = <b>{accountData.totalRecords ? accountData.totalRecords : 0}</b>;

  let right = document.body.getBoundingClientRect().right - document.querySelector(".account-dropdown-button").getBoundingClientRect().right - 27;

  if (right <= 16) {
    right = 16;
  }

  return (
    <div className={modalClasses} onClick={handleOuterClick}>
      <div
        className="pmodal-body account"
        onClick={handleBodyClick}
        style={{ right }}
      >
        <div style={{ marginBottom: "16px" }}>
          {accountData.email && <div>{accountData.email}</div>}
          {('upgrade' in accountData) && (
            <div
              style={{
                fontSize: "13px",
                lineHeight: "24px",
                color: "#979797",
                display: "flex",
                gap: 20
              }}
            >
              <span>Free account</span>
              <a className="link" href="#" onClick={onUpgrade}>
                Upgrade
              </a>
            </div>
          )}
        </div>

        {accountData.maxRecords ? (
          <div style={{ marginBottom: "18px" }}>
            {records} of {accountData.maxRecords} records
            <div
              style={{
                height: "4px",
                background: "#E7E7EE",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  height: "4px",
                  width: `${perCent(
                    accountData.totalRecords,
                    accountData.maxRecords
                  )}%`,
                  background: "#00BC62",
                  borderRadius: "4px",
                }}
              ></div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: "18px" }}>{records} records</div>
        )}

        {accountData.maxStorage ? (
          <div style={{ marginBottom: "24px" }}>
            {storage} of {humanReadableFileSize(accountData.maxStorage)}
            <div
              style={{
                height: "4px",
                background: "#E7E7EE",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  height: "4px",
                  width: `${perCent(
                    accountData.totalStorage,
                    accountData.maxStorage
                  )}%`,
                  background: "#00BC62",
                  borderRadius: "4px",
                }}
              ></div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: "24px" }}>{storage}</div>
        )}

        {('upgrade' in accountData) && (
          <div>
            <button
              className="btn btn-primary upgrade-button"
              onClick={onUpgrade}
            >
              Get more
            </button>
          </div>
        )}

        <div
          className="account-menu-item"
          onClick={(e) => handleMenuCommand(e, "Account settings")}
        >
          <svg width="24" height="24">
            <use href="#f-nut"></use>
          </svg>
          Account settings
        </div>

        <div
          className="account-menu-item"
          onClick={(e) => {
            handleMenuCommand(e, "Help");
          }}
        >
          <svg width="24" height="24">
            <use href="#f-lightbulb"></use>
          </svg>
          How it works (Help)
        </div>

        <div
          className="account-menu-item"
          onClick={(e) => handleMenuCommand(e, "Export")}
        >
          <svg width="24" height="24">
            <use href="#f-upload"></use>
          </svg>
          Export
        </div>

        <div
          className="account-menu-item"
          onClick={(e) => handleMenuCommand(e, "Import")}
        >
          <svg width="24" height="24">
            <use href="#f-download"></use>
          </svg>
          Import
        </div>

        {nmenu.includes("Bind key") && (
          <div
            className="account-menu-item"
            onClick={(e) => handleMenuCommand(e, "Bind key")}
          >
            <svg width="24" height="24">
              <use href="#f-key"></use>
            </svg>
            Bind key
          </div>
        )}

        {accountData.msp ? (
          <div
            className="account-menu-item"
            onClick={(e) => {
              handleMenuCommand(e, "Msp");
            }}
          >
            <svg width="24" height="24">
              <use href="#i-wrench"></use>
            </svg>
            MSP
          </div>

        ) : (accountData.site_admin ? (
          <div
            className="account-menu-item"
            onClick={(e) => {
              handleMenuCommand(e, "Iam");
            }}
          >
            <svg width="24" height="24">
              <use href="#i-wrench"></use>
            </svg>
            Users
          </div>
        ) : (
          <div
            className="account-menu-item"
            onClick={(e) => handleMenuCommand(e, "Contact us")}
          >
            <svg width="24" height="24">
              <use href="#f-chatCircleText"></use>
            </svg>
            Contact us
          </div>
        ))}

        {(accountData.theme != "disabled") && (
          <div
            className="account-menu-item"
            onClick={(e) => handleMenuCommand(e, "theme")}
          >
            <svg width="24" height="24" style={{ opacity: 0.6 }}>
              <use href="#theme-dark"></use>
            </svg>
            Theme
          </div>
        )}
        <ThemeMenu
          onHidden={props.onClose}
          theme={accountData.theme}
        />

        <div
          className="account-menu-item"
          style={{
            color: "var(--danger-color)",
          }}
          onClick={handleLogout}
        >
          <svg width="24" height="24">
            <use href="#f-signout"></use>
          </svg>
          Log out
        </div>
      </div>
    </div>
  );
}

export default AccountDropDown;
