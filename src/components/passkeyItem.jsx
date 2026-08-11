import React from "react";

import { lastModified } from "../lib/utils";

function PasskeyItem(props) {
  const item = props.item;

  const showDetails = () => {
    props.showModal(item);
  };

  let trClass = props.searchMode ? "search-mode" : "";
  trClass += props.newItem ? "new-item" : "";

  const title = item.cleartext?.[0] || "Passkey";
  const username = item.cleartext?.[2] || "";
  const rpId = item.cleartext?.[3] || "";

  return (
    <tr className={trClass} style={{ alignItems: "center" }}>
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
      <td className="d-none d-xl-table-cell">{username}</td>
      <td className="d-none d-md-table-cell login-item-link">{rpId}</td>
      <td className="d-none d-lg-table-cell column-modified">
        {lastModified(item)}
      </td>
    </tr>
  );
}

export default PasskeyItem;
