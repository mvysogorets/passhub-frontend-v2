import React from "react";

import { lastModified } from "../lib/utils";

function PasskeyItem(props) {
  const item = props.item;

  const showModal = () => {
    props.showModal(item);
  };

  function dragStart(ev) {
    // Change the source element's background color to signify drag has started
    //ev.currentTarget.style.border = "dashed";
    ev.dataTransfer.setData("application/json", JSON.stringify(item));
    // Tell the browser both copy and move are possible
    ev.effectAllowed = "copyMove";
  }

  const td1 = (
    <>
      <div
        draggable
        id={`drag${item._id}`}
        onDragStart={dragStart}
        style={{ overflow: "hidden", textOverflow: "ellipsis" }}
      >
        <svg
          width="24"
          height="24"
          className="itemIcon"
          style={{ cursor: "move" }}
        >
          <use href="#i-key"></use>
        </svg>
        {item.cleartext[0]}
      </div>
      {props.searchMode && (
        <div className="search-path">
          {item.path.map((e) => e[0]).join(" > ")}
        </div>
      )}
    </>
  )

  let trClass = props.searchMode ? "search-mode" : "";
  trClass += props.newItem ? "new-item" : "";

  const title = item.cleartext?.[0] || "Passkey";
  const username = item.cleartext?.[3] || "";
  const rpId = item.cleartext?.[4] || "";

  return (
    <tr className={trClass} style={{ alignItems: "center" }}>
      <td
        className="item-name-td"
        onClick={showModal}
        style={{ cursor: "pointer" }}
      >
        {td1}
      </td>
      {/*
      <td
        className="item-name-td"
        onClick={showDetails}
        style={{ cursor: "pointer" }}
      >


        <div
          id={`drag${item._id}`}
          style={{ overflow: "hidden", textOverflow: "ellipsis" }}
        >
          <svg
            width="24"
            height="24"
            className="itemIcon"
          >
            <use href="#i-key"></use>
          </svg>
          {title}
        </div>
        {props.searchMode && (
          <div className="search-path">
            {item.path.map((e) => e[0]).join(" > ")}
          </div>
        )}
      </td>
*/}
      <td className="d-none d-xl-table-cell">{username}</td>
      <td className="d-none d-md-table-cell login-item-link">{rpId}</td>
      <td className="d-none d-lg-table-cell column-modified">
        {lastModified(item)}
      </td>
    </tr>
  );
}

export default PasskeyItem;
