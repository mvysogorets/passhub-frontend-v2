import React, { useState, useRef, useEffect } from 'react';

import Col from "react-bootstrap/Col";

import Button from "react-bootstrap/Button";

import FolderItem from "./folderItem";
import PasswordItem from "./passwordItem";
import NoteItem from "./noteItem";
import BankCardItem from "./bankCardItem";
import FileItem from "./fileItem";

import PasswordModal from "./passwordModal";
import NoteModal from "./noteModal";
import FileModal from "./fileModal";
import BankCardModal from './bankCardModal';
import CreateFileModal from "./createFileModal";
import DeleteItemModal from "./deleteItemModal";
import FolderNameModal from "./folderNameModal";
import FolderMenuMobile from "./folderMenuMobile";

import PathElement from "./pathElement";

import AddDropUp from "./addDropUp";
import RefreshButton from './refreshButton';


import { getFolderById, isPasswordItem, isFileItem, isBankCardItem, isNoteItem } from "../lib/utils";

function TablePane(props) {

    const [showModal, setShowModal] = useState(null);
    const [itemModalArgs, setItemModalArgs] = useState({});
    const [addButtonRect, setAddButtonRect] = useState({ right: 5, botton: 5 });
    const [keyCounter, setKeyCounter] = useState(1);
    const [reverseSortTitle, setReverseSortTitle] = useState(false);
    const [reverseSortModified, setReverseSortModified] = useState(false);
    const [reverseSortSize, setReverseSortSize] = useState(false);
    const [sortBy, setSortBy] = useState("title");

    const newItemRef = useRef(null);

    if (!props.folder) {
        return null;
    }

    const { folder } = props;
    const addButtonRef = React.createRef();

    // let addButtonRect = { right: "16px", bottom: "16px" };


    useEffect(() => {
        const ni = document.querySelector('.new-item');

        if (ni) {
            setShowModal("")
            console.log('table useEffect scrollIntoView');
            ni.scrollIntoView({
                behavior: 'smooth'
            });
            newItemRef.current = null;
        } else {
            console.log('no new-item found')
        }

    }, [newItemRef.current]);

    const handleAddClick = (cmd) => {
        if (cmd === "Password") {
            showItemModal("PasswordModal");
            //        setItemModalArgs({edit: true});
        }
        if (cmd === "File") {
            // this.showCreateFileModal();
            showItemModal("CreateFileModal");
            setKeyCounter(keyCounter + 1);
        }
        if (cmd === "Note") {
            showItemModal("NoteModal");
        }
        if (cmd === "Bank Card") {
            showItemModal("BankCardModal");
        }
        if (cmd === "Folder") {
            let safe = folder.safe
                ? folder.safe
                : folder;
            if (props.searchMode && item) {
                safe = getFolderById(props.safes, item.SafeID);
            }

            setShowModal("FolderNameModal");
            setItemModalArgs({ parent: folder });
        };
    };

    const showAddMenu = (e) => {
        setShowModal("addDropUp");
    };

    const onItemModalClose = (refresh = false) => {
        setShowModal("");
    };
    const newItemInd = (id) => {
        newItemRef.current = id;
        console.log('newItemInd', id);
    };

    const onItemModalCloseSetFolder = (f) => {
        setShowModal("");
        if (props.searchMode) {

            if (('folder' in itemModalArgs.item) && itemModalArgs.item.folder != 0) {
                props.setActiveFolder(itemModalArgs.item.folder);
            } else {
                props.setActiveFolder(itemModalArgs.item.SafeID);
            }

        } else {
            props.setActiveFolder(f);
        }
    };

    const openDeleteItemModal = () => {
        setShowModal("DeleteItemModal");
    };

    const showItemModal = (modalName, item) => {
        let safe = folder.safe
            ? folder.safe
            : folder;
        if (props.searchMode && item) {
            safe = getFolderById(props.safes, item.SafeID);
        }
        const itemModalArgs = {
            item,
            safe,
            folder: folder,
            edit: !item,
            openDeleteItemModal: openDeleteItemModal,
        };

        setShowModal(modalName);
        setItemModalArgs(itemModalArgs);
    };

    const handleFolderMenuCmd = (node, cmd) => {
        props.onFolderMenuCmd(props.folder, cmd);
    };


    let pathString = [];
    for (let i = 0; i < folder.path.length - 1; i++) {
        pathString.push(
            <PathElement
                name={folder.path[i][0]}
                folderid={folder.path[i][1]}
                gt={folder.path.length - i - 1}
                onClick={(f) => props.setActiveFolder(f)}
            ></PathElement>
        );
    }


    const emptyFolder = !(folder.folders.length + folder.items.length > 0);
    const isSafe = folder.path.length === 1 && !props.searchMode;
    let EmptyMessage = isSafe ? "Empty safe" : "Empty folder";
    if (props.searchMode) {
        EmptyMessage = (
            <div>
                <b>
                    <p>Nothing found</p>
                    <p>Try another search</p>
                </b>
            </div>
        );
    }

    const sortByTitle = () => {
        if (sortBy != "title") {
            setSortBy("title");
        } else {
            setReverseSortTitle(!reverseSortTitle);
        }
    }

    const sortByModified = () => {
        if (sortBy != "modified") {
            setSortBy("modified");
        } else {
            setReverseSortModified(!reverseSortModified);
        }
    }

    const sortBySize = () => {
        if (props.searchType == 'Files') {
            if (sortBy != "size") {
                setSortBy("size");
            } else {
                setReverseSortSize(!reverseSortSize);
            }
        }
    }

    const sortFunction = (a, b) => {
        if (sortBy == 'title') {
            if (!reverseSortTitle) return a.name.localeCompare(b.name); else return b.name.localeCompare(a.name);
        }
        if (!reverseSortModified) return a.lastModified > b.lastModified ? -1 : 1; else return a.lastModified < b.lastModified ? -1 : 1;
    }

    const itemName = (item) => {
        if (isPasswordItem(item)) return item.cleartext[0];
        if (isNoteItem(item)) return item.cleartext[0];
        if (isFileItem(item)) return item.cleartext[0];
        if (isBankCardItem(item)) return item.cleartext[1];
    }
    const sortItemsFunction = (a, b) => {

        if (sortBy == 'title') {
            if (!reverseSortTitle) return itemName(a).localeCompare(itemName(b)); else return itemName(b).localeCompare(itemName(a));
        }
        if ((props.searchType == 'Files') && (sortBy == 'size')) {
            if (!reverseSortSize) return a.file.size - b.file.size; else return b.file.size - a.file.size;
        }

        if (!reverseSortModified) return a.lastModified > b.lastModified ? -1 : 1; else return a.lastModified < b.lastModified ? -1 : 1;
    }

    // toSorted is too new 
    //    const sortedFolders = folder.folders.toSorted(sortFunction);
    const sortedFolders = [...folder.folders];
    sortedFolders.sort(sortFunction);


    // const sortedItems = folder.items.toSorted(sortItemsFunction);

    const sortedItems = [...folder.items];
    sortedItems.sort(sortItemsFunction);


    let reverseSort = sortBy == "title" ? reverseSortTitle : reverseSortModified;
    if (sortBy == 'size') {
        reverseSort = reverseSortSize;
    }

    const sortArrow = reverseSort ? (
        <svg width="24" height="24" style={{ fill: "var(--body-color)", transform: "rotate(180deg)" }}><use href="#angle"></use></svg>
    ) : (
        <svg width="24" height="24" style={{ fill: "var(--body-color)" }}><use href="#angle"></use></svg>
    )

    return (
        <Col
            className="col-xl-9 col-lg-8 col-md-7 col-sm-6 d-none d-sm-block"
            id="table_pane"
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    // marginRight: "0.3em",
                }}
            >
                <div
                    className="d-sm-none"
                    style={{
                        display: "flex",
                        cursor: "pointer",
                        alignItems: "center",
                        background: "var(--mobile-path-background)",
                        color: "var(--link-color)",
                        padding: "12px 0",

                    }}
                    onClick={() => {
                        if (props.searchMode) {
                            props.onSearchClear();
                        }

                        if (props.folder.SafeID) {
                            props.openParentFolder(props.folder);
                        } else {
                            document.querySelector("#safe_pane").classList.remove("d-none");
                            document.querySelector("#table_pane").classList.add("d-none");
                        }
                    }}
                >
                    <svg
                        width="24"
                        height="24"
                        style={{
                            fill: "#009a50",
                            transform: "rotate(90deg)",
                        }}
                    >
                        <use href="#angle"></use>
                    </svg>
                    <span style={{
                        overflow: "hidden",
                        textWrap: "nowrap",
                        textOverflow: "ellipsis",

                    }}>{folder.path.length === 1
                        ? "All safes"
                        : folder.path[folder.path.length - 2][0]}
                    </span>

                </div>
                <div
                    className="d-sm-none"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        position: "relative",
                        padding: "6px 0",
                        alignItems: "center",
                    }}
                >
                    <div style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "var(--table-pane-color)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingLeft: 12
                    }}>{folder.path[folder.path.length - 1][0]}</div>
                    {!props.searchMode && true && (
                        <FolderMenuMobile
                            node={folder}
                            onMenuCmd={handleFolderMenuCmd}
                            isSafe={!folder.safe}
                        />
                    )}
                </div>
                <div className="d-none d-sm-flex" style={{ justifyContent: "space-between", paddingRight: "1em" }}>
                    <div className="d-none d-sm-block path">
                        {pathString}
                        <b>{folder.path[folder.path.length - 1][0]}</b>
                    </div>
                    <RefreshButton fill="var(--icon-stroke)"></RefreshButton>
                </div>

                {emptyFolder && (
                    <div>
                        <div style={{ textAlign: "center" }}>
                            <svg
                                width="260"
                                height="208"
                                style={{ margin: "2em auto 1em auto", display: "block" }}
                            >
                                <use href={isSafe ? "#f-emptySafe" : "#f-emptyFolder"}></use>
                            </svg>
                            {EmptyMessage}
                        </div>
                    </div>
                )}

                {!emptyFolder && (
                    <div
                        className="custom-scroll fixed-head-table-wrapper"
                    >
                        <table className="item_table">
                            <thead>
                                <tr className="d-none d-sm-table-row">
                                    <th className="d-none d-sm-table-cell col-sm-12 col-md-6 col-lg-4 col-xl-3" onClick={sortByTitle}
                                        style={{ cursor: "pointer" }}>
                                        Title {sortBy === "title" && sortArrow}
                                    </th>
                                    <th className="d-none d-xl-table-cell                             col-xl-3"></th>

                                    {props.searchType == 'Files' ? (
                                        <th className="d-none d-md-table-cell           col-md-6 col-lg-4 col-xl-3 rightAlign" onClick={sortBySize}
                                            style={{ cursor: "pointer" }}>{sortBy === "size" && sortArrow} Size</th>
                                    ) : (
                                        <th className="d-none d-md-table-cell           col-md-6 col-lg-4 col-xl-3 rightAlign"></th>
                                    )}

                                    <th className="d-none d-lg-table-cell                    col-lg-4 col-xl-3 column-modified" onClick={sortByModified}
                                        style={{ cursor: "pointer" }} >
                                        {sortBy === "modified" && sortArrow} Modified
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFolders.map((f) => (
                                    <FolderItem
                                        item={f}
                                        key={`folder${f._id}`}
                                        searchMode={props.searchMode}
                                        dropItem={props.dropItem}
                                        onClick={(folder) => { props.setActiveFolder(folder) }}
                                    />
                                ))}
                                {sortedItems.map(
                                    (f) =>
                                        (isPasswordItem(f) && (
                                            <PasswordItem
                                                item={f}
                                                key={`item${f._id}`}
                                                searchMode={props.searchMode}
                                                newItem={newItemRef.current == f._id}
                                                showModal={(item) =>
                                                    showItemModal("PasswordModal", item)
                                                }
                                            />
                                        )) ||
                                        (isNoteItem(f) && (
                                            <NoteItem
                                                item={f}
                                                key={`item${f._id}`}
                                                searchMode={props.searchMode}
                                                newItem={newItemRef.current == f._id}
                                                showModal={(item) =>
                                                    showItemModal("NoteModal", item)
                                                }
                                            />
                                        )) ||
                                        (isFileItem(f) && (
                                            <FileItem
                                                item={f}
                                                key={`item${f._id}`}
                                                searchMode={props.searchMode}
                                                newItem={newItemRef.current == f._id}
                                                showModal={(item) =>
                                                    showItemModal("FileModal", item)
                                                }
                                            />
                                        )) ||
                                        (isBankCardItem(f) && (
                                            <BankCardItem
                                                item={f}
                                                key={`item${f._id}`}
                                                searchMode={props.searchMode}
                                                newItem={newItemRef.current == f._id}
                                                showModal={(item) =>
                                                    showItemModal("BankCardModal", item)
                                                }
                                            />
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/*this.addMenu*/}
                {!props.searchMode ? (
                    <Button
                        variant="primary"
                        type="submit"
                        ref={addButtonRef}
                        id="addButtonId"
                        title="Add record"
                        style={{
                            width: "80px",
                            height: "80px",
                            position: "absolute",
                            bottom: "16px",
                            right: "16px",
                            minWidth: "0",
                            padding: "20px",
                            borderRadius: "14px",
                        }}
                        onClick={() => {
                            //                            addButtonRect = addButtonRef.current.getBoundingClientRect(); 
                            setAddButtonRect(addButtonRef.current.getBoundingClientRect());
                            showAddMenu();
                        }}
                    >
                        <svg width="40" height="40" style={{ strokeWidth: 2 }}>
                            <use href="#f-plus"></use>
                        </svg>
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        type="submit"
                        ref={addButtonRef}
                        title="Reset Search mode"
                        style={{
                            position: "absolute",
                            bottom: "16px",
                            right: "16px",
                            minWidth: "0",
                            padding: "20px",
                            borderRadius: "14px",
                        }}
                        onClick={() => {
                            props.onSearchReset();
                        }}
                    >
                        Reset Search <br />& Filters
                    </Button>

                )}


                <AddDropUp
                    show={showModal === "addDropUp"}
                    bottom={window.innerHeight - addButtonRect.bottom - 8}
                    right={window.innerWidth - addButtonRect.right - 8}
                    onClose={() => setShowModal("")}
                    handleAddClick={handleAddClick}
                ></AddDropUp>

                <PasswordModal
                    show={showModal === "PasswordModal"}
                    args={itemModalArgs}
                    openDeleteItemModal={openDeleteItemModal}
                    onClose={onItemModalClose}
                    newItemInd={newItemInd}
                    onCloseSetFolder={onItemModalCloseSetFolder}
                    key="pwm"
                ></PasswordModal>

                <FileModal
                    show={showModal === "FileModal"}
                    args={itemModalArgs}
                    openDeleteItemModal={openDeleteItemModal}
                    onClose={onItemModalClose}
                    onCloseSetFolder={onItemModalCloseSetFolder}
                    inMemoryView={(blob, filename) => {
                        setShowModal("");
                        props.inMemoryView(blob, filename);
                    }}
                ></FileModal>

                <CreateFileModal
                    show={showModal === "CreateFileModal"}
                    args={itemModalArgs}
                    openDeleteItemModal={openDeleteItemModal}
                    onClose={onItemModalClose}
                    key={keyCounter}
                    newItemInd={newItemInd}
                ></CreateFileModal>

                <NoteModal
                    show={showModal === "NoteModal"}
                    args={itemModalArgs}
                    openDeleteItemModal={openDeleteItemModal}
                    onClose={onItemModalClose}
                    onCloseSetFolder={onItemModalCloseSetFolder}
                    onCopyMove={props.onCopyMove}
                    newItemInd={newItemInd}

                    key="nm"
                ></NoteModal>

                <BankCardModal
                    show={showModal === "BankCardModal"}
                    args={itemModalArgs}
                    openDeleteItemModal={openDeleteItemModal}
                    onClose={onItemModalClose}
                    onCloseSetFolder={onItemModalCloseSetFolder}
                    newItemInd={newItemInd}

                    key="bcm"
                ></BankCardModal>

                <DeleteItemModal
                    show={showModal === "DeleteItemModal"}
                    folder={folder}
                    args={itemModalArgs}
                    onClose={onItemModalClose}
                ></DeleteItemModal>

                <FolderNameModal
                    show={showModal == "FolderNameModal"}
                    args={itemModalArgs}
                    onClose={(refresh = false, newFolderID) => {
                        setShowModal("");
                    }}
                ></FolderNameModal>
            </div>
        </Col>
    )
}

export default TablePane; 
