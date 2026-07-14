import React from "react";
import { lastModified } from "../lib/utils";

function AddressItem(props) {
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
          width="20"
          height="24"
          className="itemIcon"
          style={{ cursor: "move", opacity: 0.8 }}
        >
          <use href="#geo-alt"></use>
        </svg>
        {item.cleartext[1]}
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

  return (
    <tr className={trClass} style={{ alignItems: "center" }}>
      <td
        colSpan="3"
        className="d-none d-xl-table-cell item-name-td"
        onClick={showModal}
        style={{ cursor: "pointer" }}
      >
        {td1}
      </td>
      <td
        colSpan="2"
        className="d-none d-md-table-cell d-xl-none item-name-td"
        onClick={showModal}
        style={{ cursor: "pointer" }}
      >
        {td1}
      </td>
      <td
        className="d-md-none item-name-td"
        onClick={showModal}
      >
        {td1}
      </td>

      <td className="d-none d-lg-table-cell column-modified">
        {lastModified(item)}
      </td>
    </tr>
  );
}

export default AddressItem;
