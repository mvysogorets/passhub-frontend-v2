import React, { useState, useEffect } from "react";
import Col from "react-bootstrap/Col";

import FolderTreeNode from "./folderTreeNode";
import MobileSafeNode from "./mobileSafeNode";
import RefreshButton from "./refreshButton";

function SafePane(props) {

  const [showModal, setShowModal] = useState("");

  useEffect(() => {

    const af = document.querySelector('.active_folder');
    if (af) {
      af.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [props.activeFolder])

  const handleSelect = (folder) => {
    if ('sharedAt' in folder) {
      delete folder.sharedAt;
    }
    props.setActiveFolder(folder);
  };

  let modalKey = 10000;

  if (!props.show) {
    return null;
  }

  return (
    <Col
      className="col-xl-3 col-lg-4 col-md-5 col-sm-6 col d-sm-block safe_pane "
      id="safe_pane"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          // marginRight: "0.3em",
        }}
      >
        {/*<div className="folder">Recent and favorities</div> */}
        <div className="folders-header d-flex" style={{ justifyContent: "space-between", paddingRight: "1em" }}>
          <span>SAFES</span>
          <div className="d-sm-none">
            <RefreshButton fill="var(--safe-pane-icon-stroke)"></RefreshButton>
          </div>
        </div>

        <div className="safe_scroll_control custom-scroll d-sm-none">
          {props.safes.map((s) => (
            <MobileSafeNode
              key={`m${s.id}`}
              node={s}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="safe_scroll_control custom-scroll d-none d-sm-block">
          {props.safes.map((s) => (
            <FolderTreeNode
              key={s.id}
              node={s}
              onSelect={handleSelect}
              activeFolder={props.activeFolder}
              onOpen={props.handleOpenFolder}
              open={props.openNodes.has(s.id) && props.openNodes}

              dropItem={props.dropItem}

              isSafe={true}
              onMenuCmd={props.onFolderMenuCmd}
              padding={20}
            />
          ))}
        </div>

        <div
          className="add_safe"
          onClick={() => {
            props.onFolderMenuCmd(null, "add safe");
          }}
        >
          Add safe
        </div>

      </div>

    </Col>
  );
}

export default SafePane;
