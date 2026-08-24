import { useState } from "react";

import FolderMenu from "./folderMenu";

const sharedFolderIcon = (
  <svg className="safe_pane_icon" style={{ width: 26, height: 26 }}>
    <use href="#i-folder_shared"></use>
  </svg>
);

const folderIcon = (
  <svg className="safe_pane_icon" style={{ width: 26, height: 26 }}>
    <use href="#i-folder"></use>
  </svg>
);

function FolderTreeNode(props) {

  const getClass = () => {
    return props.node.id === props.activeFolder.id
      ? "folder active_folder"
      : "folder";
  };

  function onDrop(ev) {
    ev.currentTarget.style.background = "none";
    try {
      const item = JSON.parse(ev.dataTransfer.getData("application/json"));
      props.dropItem(props.node, item);
    } catch (e) {
      console.log(e);
    }
  }

  function onDragOver(ev) {
    // ev.currentTarget.style.background = "lightblue";
    ev.currentTarget.style.background =
      "linear-gradient(90deg, rgba(255,255,255,0.4),  rgba(255,255,255,0))";
    ev.preventDefault();
    // console.log(ev);
  }

  function onDragLeave(ev) {
    ev.currentTarget.style.background = "none";
    ev.currentTarget.style.border = "none";
    ev.preventDefault();
  }

  const handleMenuCmd = (node, cmd) => {
    props.onMenuCmd(props.node, cmd);
  };

  const menuDots = (
    <FolderMenu
      node={props.node}
      onMenuCmd={handleMenuCmd}
      isSafe={props.isSafe}
    />
  );

  const icon = props.node.users > 1 ? sharedFolderIcon : folderIcon;

  const menuDotsHere = props.node.id === props.activeFolder.id ? menuDots : "";

  const padding = props.padding ? props.padding : 0;

  const badge = ('sharedAt' in props.node) ? (<div style={{ width: 10, height: 10, borderRadius: 5, background: "red", position: "absolute", top: 11, left: 62 }}></div>) : '';
  // green badge: #00ba97



  if ("folders" in props.node && props.node.folders.length > 0) {
    const folders = props.open
      ? props.node.folders.map((s) => (
        <FolderTreeNode
          dropItem={props.dropItem}
          onSelect={props.onSelect}
          key={s.id}
          node={s}
          padding={padding + 20}
          open={props.open.has(s.id) && props.open}
          onOpen={props.onOpen}
          activeFolder={props.activeFolder}
          onMenuCmd={props.onMenuCmd}
        />
      ))
      : "";
    const angleIcon = (
      <svg
        width="24"
        height="24"
        style={{
          fill: "white",
          transform: props.open ? false : "rotate(-90deg)",
        }}
        onClick={(e) => {
          // e.preventDefault();
          e.stopPropagation();
          props.onOpen(props.node);
        }}
      >
        <use href="#angle"></use>
      </svg>
    );

    return (
      <div style={{ position: "relative" }}>
        {badge}
        <div
          className={getClass()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => props.onSelect(props.node)}
          style={{
            position: "relative",
            paddingLeft: padding + "px",
            outline: "none",
            display: "flex",
          }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap" }}>
            {angleIcon}
            {icon}
          </div>
          <div
            style={{
              cursor: "default",
              flexGrow: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {props.node.name}
          </div>
          {menuDotsHere}
        </div>
        {folders}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {badge}

      <div
        className={getClass()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => props.onSelect(props.node)}
        style={{
          position: "relative",
          overflow: "hidden",
          whiteSpace: "nowrap",
          paddingLeft: padding + 24 + "px",
          outline: "none",
          //        display: "flex",
        }}
      >
        <div style={{ cursor: "default" }}>
          {icon}
        </div>
        <div
          style={{
            cursor: "default",
            flexGrow: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {props.node.name}
        </div>
        {menuDotsHere}
      </div>
    </div>
  );
}

export default FolderTreeNode;
