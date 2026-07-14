import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import Row from "react-bootstrap/Row";

import { getApiUrl, getVerifier, logMeOut } from "../lib/utils";
import { getAccountData } from "../lib/userData";
import SearchBlock from "./searchBlock";

import AccountDropDown from "./accountDropDown";
import AccountModal from "./accountModal";
import DeleteAccountModal from "./deleteAccountModal";
import DeleteAccountFinalModal from "./deleteAccountFinalModal";
import ImportModal from "./importModal";
import ExportFolderModal from "./exportFolderModal";
import EmailModal from "./emailModal";
import VerifyEmailModal from "./verifyEmailModal";
import ContactUsModal from "./contactUsModal";
import BindKeyModal from "./bindKeyModal";
import MessageModal from "./messageModal";
import UpgradeModal from "./upgradeModal";


function Header(props) {

    const mockAccountData = {
        business: false,
        email: "mymail@gmail.com",
        plan: "FREE",
        totalStotrage: 1024 * 1024 * 10,
    };

    const [showModal, setShowModal] = useState("");
    const [accountData, setAccountData] = useState(mockAccountData);
    const [emailToVerify, setEmailToVerify] = useState("");

    const { isLoading, error, data } = useQuery({
        queryKey: ["accountData"],

        queryFn: () => Promise.resolve(2).then(data => {
            // console.log(99);
            //      setCmtData(data);
            return data;
        }),
        onSuccess: () => {
            // console.log('success 44')
        }

    });

    if (isLoading) {
        // console.log('loading 46');
    } else if (error) {
        //  console.log('error 46', error);
    } else {
        // console.log('navSpan 48', data);
        if (getAccountData() != accountData) {
            //        console.log('setting state 55');
            setAccountData(getAccountData());
        }
    }

    const accountOperation = (newData) => {
        const axiosData = newData
            ? newData
            : {
                verifier: getVerifier(),
            };
        axios.post(`${getApiUrl()}account.php`, axiosData).then((reply) => {
            const result = reply.data;
            if (result.status === "Ok") {
                // self.setState({ accountData: result });
                return;
            }
            if (result.status === "login") {
                window.location.href = "expired.php";
                return;
            }
        });
    };

    const showAccountDropDown = (e) => {
        e.stopPropagation();
        setShowModal("AccountDropDown");
    };

    //    const nmenu = ["Bind key"];
    const nmenu = [];


    const handleMenuCommand = (cmd) => {
        if (cmd === "Bind key") {
            setShowModal("Bind key");
            return;
        }
        if (cmd === "Contact us") {
            setShowModal("Contact us");
            return;
        }
        if (cmd === "Account settings") {
            setShowModal("Account settings");
            return;
        }
        if (cmd === "upgrade") {
            setShowModal("upgrade");
            return;
        }
        if (cmd === "Export") {
            setShowModal("Export");
            return;
        }
        if (cmd === "Import") {
            setShowModal("Import");
            return;
        }
        if (cmd === "Help") {
            window.open("https://passhub.net/doc", "passhub_doc", []);
            return;
        }
        if (cmd === "Iam") {
            props.gotoIam();
        }
        if (cmd === "Msp") {
            props.gotoMsp();
        }


        //    props.onMenuCommand(cmd);
    };


    return (
        <>

            <>
                <Row >
                    <div style={{ display: "flex", paddingLeft: 24, paddingRight: 16, justifyContent: "space-between", marginBottom: 16, marginTop: 16, alignItems: "center" }}>

                        <div style={{ marginRight: 37 }}>
                            <span
                                onClick={props.gotoMain}
                                style={{
                                    cursor: props.page === "Main" ? "default" : "pointer",
                                }}
                            >
                                {/*
                                <img src="public/img/passhub_logo.svg" style={{ width: 133 }} />


                                <svg style={{ fill: "var(--logo-color)", width: 133, height: 26.5 }}>
                                    <use href="#ph-logo-mh"></use>
                                </svg>


                                <svg style={{ fill: "var(--logo-color)", width: 133, height: 17.5 }}>
                                    <use href="#ph-logo-3d"></use>
                                </svg>
                                <img src="/public/img/logo/logo.svg" style={{ width: 133, height: 26.5 }} />

                                */}


                                <svg style={{ fill: "var(--logo-color)", width: 133, height: 17.5 }}>
                                    <use href="#ph-logo-2d"></use>
                                </svg>

                            </span>
                            <span className="d-md-none" id="xs_indicator"></span>
                        </div>

                        <SearchBlock
                            onSearchTypeChange={props.onSearchTypeChange}
                            searchType={props.searchType}
                            onSearchChange={props.onSearchChange}
                            onSearchClear={props.onSearchClear}
                            searchString={props.searchString}
                            desktop={true}
                            page={props.page}
                        />

                        {((props.page == "Iam") || (props.page == "Msp")) && (
                            <div onClick={props.gotoMain} style={{ cursor: "pointer" }}>
                                <svg width="32" height="32">
                                    <use href="#f-cross"></use>
                                </svg>
                            </div>
                        )}

                        {props.page !== "Login" && props.page !== "Iam" && props.page !== "Msp" && (
                            <div style={{ display: "flex", marginLeft: 37 }}>
                                <div className="account-dropdown-button"
                                    onClick={showAccountDropDown}
                                //onClick={showAccountMenu}
                                >
                                    <svg width="40" height="34" style={{ opacity: 0.7 }}>
                                        <use href="#f-account"></use>
                                    </svg>
                                </div>
                                <span
                                    className="d-none d-sm-inline"
                                    onClick={showAccountDropDown}
                                    style={{ padding: "8px 0 0 0", cursor: "pointer" }}
                                >
                                    <svg width="24" height="24" fill="white">
                                        <use href="#angle"></use>
                                    </svg>
                                </span>
                            </div>
                        )}

                    </div>
                </Row>

                <Row className="d-sm-none">
                    <SearchBlock
                        onSearchTypeChange={props.onSearchTypeChange}
                        searchType={props.searchType}
                        onSearchChange={props.onSearchChange}
                        onSearchClear={props.onSearchClear}
                        searchString={props.searchString}
                        page={props.page}
                    />
                </Row>

                <AccountDropDown
                    show={showModal == "AccountDropDown"}
                    onClose={() => setShowModal("")}
                    onMenuCommand={handleMenuCommand}
                    nmenu={nmenu}
                    accountData={accountData}
                />

                <AccountModal
                    show={showModal === "Account settings"}
                    accountData={accountData}
                    accountOperation={accountOperation}
                    onClose={(dummy, next) => {
                        setShowModal(next ? next : "");
                    }}
                ></AccountModal>

                <DeleteAccountModal
                    show={showModal === "delete account"}
                    onClose={(dummy, next) => {
                        setShowModal(next ? next : "");
                    }}
                ></DeleteAccountModal>

                <DeleteAccountFinalModal
                    show={showModal === "delete account final"}
                    onClose={(dummy, next) => {
                        setShowModal(next ? next : "");
                    }}
                ></DeleteAccountFinalModal>
                <MessageModal
                    show={showModal === "success"}
                    onClose={() => {
                        setShowModal("");
                    }}
                >
                    Your message has been sent
                </MessageModal>

                <MessageModal
                    show={showModal === "account deleted"}
                    onClose={() => {
                        setShowModal("");
                        logMeOut();
                    }}
                >
                    Your account has been deleted
                </MessageModal>

                <UpgradeModal
                    show={showModal === "upgrade"}
                    onClose={() => {
                        setShowModal("");
                    }}
                ></UpgradeModal>

                <EmailModal
                    show={showModal === "email"}
                    onClose={(dummy, next, email) => {
                        setShowModal(next ? "verifyEmail" : "");
                        setEmailToVerify(email);
                    }}
                ></EmailModal>

                <VerifyEmailModal
                    show={showModal === "verifyEmail"}
                    emailToVerify={emailToVerify}
                    onClose={(dummy, next) => {
                        setShowModal(next ? "Contact us" : "");
                    }}
                ></VerifyEmailModal>

                <ImportModal
                    show={showModal === "Import"}
                    onClose={(dummy, next) => {
                        setShowModal(next ? next : "");
                    }}
                ></ImportModal>

                <ExportFolderModal
                    show={showModal == "Export"}
                    onClose={() => {
                        setShowModal("")
                    }}
                ></ExportFolderModal>

                <ContactUsModal
                    show={showModal === "Contact us"}
                    onClose={(dummy, next) => {
                        setShowModal(next ? next : "");
                    }}
                ></ContactUsModal>

                <BindKeyModal
                    show={showModal === "Bind key"}
                    onClose={(dummy, next) => {
                        setShowModal(next ? next : "");
                    }}
                ></BindKeyModal>

            </>
        </>
    );
}

export default Header;




/*
      <Row>
        <Col
          style={{
            paddingLeft: 24,
            paddingRight: 16,
            margin: "16px auto 16px auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: props.narrowPage ? "680px" : "",
          }}
        >
          <div>
            <span
              onClick={props.gotoMain}
              style={{
                cursor: props.page === "Main" ? "default" : "pointer",
              }}
            >

              <svg style={{ fill: "var(--logo-color)", width: 133, height: 26.5 }}>
                <use href="#ph-logo"></use>
              </svg>

            </span>
            <span className="d-md-none" id="xs_indicator"></span>
          </div>

          <NavSpan
            onSearchTypeChange={props.onSearchTypeChange}
            searchType={props.searchType}

            onSearchChange={props.onSearchChange}
            onSearchClear={props.onSearchClear}
            searchString={props.searchString}

            page={props.page}
            gotoIam={props.gotoIam}
            gotoMain={props.gotoMain}
            gotoMsp={props.gotoMsp}
          />
        </Col>

      </Row>
*/