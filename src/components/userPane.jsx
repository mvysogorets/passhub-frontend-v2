import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";

import { fromArrays } from '../lib/csv';

import Col from "react-bootstrap/Col";

import Button from "react-bootstrap/Button";

import {
    Menu,
    Item,
    contextMenu,
} from "react-contexify";
import "react-contexify/dist/ReactContexify.css";

import UserTable from './userTable';

export default function UserPane(props) {
    const [searchString, setSearchString] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [email, setEmail] = useState("");
    const [inviteAsAdmin, setInviteAsAdmin] = useState(false);

    const queryClient = useQueryClient();

    const newUserAction = () => {
        if (email.trim() == "") {
            return;
        }
        const args = {
            verifier: getVerifier(),
            operation: "newuser",
            email: email.trim(),
            admin: inviteAsAdmin,
        };
        if (props.company) {
            args.company = props.company._id;
        }

        return axios
            .post(`${getApiUrl()}iam.php`, args)
            .then((response) => {
                const result = response.data;

                if (result.status === "Ok") {
                    setEmail("");
                    setInviteAsAdmin(false);
                    setErrorMsg("");
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

    const newUserMutation = useMutation({
        mutationFn: newUserAction,
        onSuccess: data => {
            queryClient.invalidateQueries({ queryKey: ["userList"], exact: true })
        },
    })

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["userList"], exact: true })
    }



    const onExport = () => {
        let csv = 'email, role, lastSeen\r\n';

        for (let user of props.users) {
            let status = user.status;
            if (user.disabled) {
                status = "disabled";
            }

            if (!status) {
                status = user.site_admin ? "admin" : "active";
            }
            csv += fromArrays([[user.email, status, user.lastSeen]])
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, "passhub-users.csv");
    }

    const submitEmail = () => {
        newUserMutation.mutate();
    };

    const inputOnFocus = () => {
        setErrorMsg("");
    };

    const inputOnChange = (event) => {
        setEmail(event.target.value);
        setErrorMsg("");
    };

    const inputOnKeyDown = (event) => {
        if (event.key == "Enter") {
            setEmail(event.target.value);
            submitEmail();
        }
    };

    /*
        const clearInput = () => {
            setErrorMsg("");
            setEmail("");
        };
    
    const inputBackground = searchString.trim().length
        ? "white"
        : "rgba(255, 255, 255, 0.6)";

    */

    const onSearchChange = (e) => {
        setSearchString(e.target.value);
    }

    const searchClear = () => {
        setSearchString("");
    }

    const licensed_users = props.licensed ? `/${props.licensed}` : '';

    function showGroupPane() {
        document.querySelector('#user-pane').classList.add("d-none");
        document.querySelector('.group_pane').classList.remove("d-none");
    }

    return (
        <Col
            className="col-xl-9 col-lg-8 col-md-7 col-sm-7 d-sm-block"
            id="user-pane"
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    padding: "0 24px"
                }}
            >

                <div>

                    <div className="d-sm-none" onClick={showGroupPane} style={{ textAlign: "right", cursor: "pointer", color: "var(--link-color)", marginBottom: 16 }}>User Groups &gt;</div>
                    <div className="d-sm-none" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: 24, lineHeight: "34px" }}>User management</div>
                        <div onClick={(event) => {
                            contextMenu.show({
                                id: "user-pane-menu",
                                event
                            });
                        }}>
                            <svg width="24" height="24" style={{ opacity: 0.5, stroke: "#1b1b26", cursor: "pointer" }}>
                                <use href="#kebab"></use>
                            </svg>
                        </div>
                    </div>

                    <div className="d-none d-sm-flex" style={{ justifyContent: "space-between" }}>
                        <div><b>User management</b></div>

                        <div style={{ display: "flex", gap: 32 }}>
                            {props.company && <div style={{ cursor: "pointer", color: "var(--link-color)" }} onClick={props.showCompanyModal}>Settings</div>}

                            <div style={{ cursor: "pointer", color: "var(--link-color)" }} onClick={props.showAuditModal}>Audit</div>
                            {props.LDAP ? (
                                <div onClick={refresh} title="Refresh" style={{ cursor: "pointer" }}>
                                    <svg width="24" height="24">
                                        <use href="#arrow-clockwise"></use>
                                    </svg>
                                </div>
                            ) : (
                                <>
                                    <div style={{ cursor: "pointer", color: "var(--link-color)" }} onClick={onExport}>Export</div>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ margin: "16px 0 8px", display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                        {props.LDAP ? (
                            <div style={{ flexGrow: 1 }}>ACTIVE DIRECTORY</div>
                        ) : (
                            <>
                                <input className="basic-input"
                                    type="email"
                                    placeholder="Email"
                                    style={{ flexGrow: 1 }}
                                    onFocus={inputOnFocus}
                                    onChange={inputOnChange}
                                    onKeyDown={inputOnKeyDown}
                                    value={email}
                                />
                                <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0, cursor: "pointer", whiteSpace: "nowrap" }}>
                                    <input
                                        type="checkbox"
                                        checked={inviteAsAdmin}
                                        onChange={(e) => setInviteAsAdmin(e.target.checked)}
                                    />
                                    Admin
                                </label>
                                <Button className="d-none d-lg-block" style={{ margin: 0 }} onClick={submitEmail}>Add User</Button>
                            </>
                        )}
                        <span className="d-none d-lg-block" style={{ padding: "12px 16px", borderRadius: 12, background: "#E6E6F04D", color: "#1B1B26" }}>
                            Users {props.users.length}{licensed_users}
                        </span>
                    </div>
                    <div className="d-lg-none" style={{ display: "flex", gap: 16 }}>
                        <span style={{ padding: "12px 16px", borderRadius: 12, background: "#E6E6F04D", color: "#1B1B26", display: "inline-block", flexGrow: 1 }}>
                            Users {props.users.length}{licensed_users}
                        </span>
                        {!props.LDAP && (
                            <Button style={{ margin: 0 }} onClick={submitEmail}>Add User</Button>
                        )}
                    </div>
                    <div id="add-user-error" style={{ height: 16, paddingLeft: 12, lineHeight: "16px", color: "red" }}>{errorMsg}</div>
                    <div style={{ display: "flex", position: "relative", margin: "8px 0 16px 0" }}>
                        <input className="search_string"
                            type="text"
                            autoComplete="off"
                            onChange={onSearchChange}
                            value={searchString}
                            placeholder="Search Users"
                        />
                        <span className="search_clear" onClick={searchClear} style={{ margin: "12px 0 0 -27px" }}>
                            <svg width="0.7em" height="0.7em" className="item_icon" style={{ fill: "var(--table-pane-color)" }}>
                                <use href="#cross"></use>
                            </svg>
                        </span>
                        <span style={{ position: "absolute", left: "12px", top: "10px" }}>
                            <svg
                                width="24"
                                height="24"
                                style={{
                                    opacity: 0.6,
                                    stroke: "var(--table-pane-color)",
                                }}
                            >
                                <use href="#f-search"></use>
                            </svg>
                        </span>
                    </div>
                </div>
                <UserTable
                    users={props.users}
                    me={props.me}
                    LDAP={props.LDAP}
                    searchString={searchString}
                    showDelDialog={props.showDelDialog}
                    showUserModal={props.showUserModal}
                >
                </UserTable>
            </div>

            <Menu id={"user-pane-menu"}>
                <Item onClick={props.showAuditModal}>
                    Audit
                </Item>
                <Item onClick={onExport}>
                    Export
                </Item>
            </Menu>
        </Col >
    )
}
