import React from "react";
import { lastModified } from "../lib/utils";

function IncompatibleItem(props) {
  const item = props.item;

  const td1 = (
    <>
      <div
        style={{ overflow: "hidden", textOverflow: "ellipsis", opacity: 0.5 }}
      >
        ({item.cleartext[0]})
      </div>
    </>
  )

  return (
    <tr style={{ alignItems: "center" }}>
      <td
        colSpan="3"
        className="d-none d-xl-table-cell item-name-td"
      >
        {td1}
      </td>
      <td
        colSpan="2"
        className="d-none d-md-table-cell d-xl-none item-name-td"
      >
        {td1}
      </td>
      <td
        className="d-md-none item-name-td"
      >
        {td1}
      </td>
      <td className="d-none d-lg-table-cell column-modified">
        {item?.lastModified && lastModified(item)}
      </td>

    </tr>
  );
}

export default IncompatibleItem;
