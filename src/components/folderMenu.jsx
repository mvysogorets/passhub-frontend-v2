import { contextMenu, Menu, Item } from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import { isCopyBufferEmpty } from "../lib/copyBuffer";

import { isPasteEnabled } from "../lib/utils";

const SAFE_MENU_ID = "safe-menu-id";
const FOLDER_MENU_ID = "folder-menu-id";

function FolderMenu(props) {

  const handleItemClick = (cmd) => {
    props.onMenuCmd(props.node, cmd);
  };

  const folderMenu = (
    <Menu id={FOLDER_MENU_ID} >
      <Item
        onClick={() => {
          handleItemClick("rename");
        }}
      >
        Rename
      </Item>
      <Item
        onClick={() => {
          handleItemClick("Add folder");
        }}
      >
        Add folder
      </Item>
      <Item
        disabled={!isPasteEnabled()}
        onClick={() => {
          handleItemClick("Paste");
        }}
      >
        Paste
      </Item>
      <Item
        onClick={() => {
          handleItemClick("export");
        }}
      >
        Export
      </Item>
      <Item
        onClick={() => {
          handleItemClick("delete");
        }}
      >
        Delete
      </Item>
      {/*      
      <Item
        onClick={() => {
          handleItemClick("convertFolderToSafe");
        }}
      >
        Convert to Safe
      </Item>
*/}

    </Menu>
  );

  const safeMenu = (
    <Menu id={SAFE_MENU_ID}>
      <Item
        onClick={() => {
          handleItemClick("Share");
        }}
      >
        Share
      </Item>
      <Item
        onClick={() => {
          handleItemClick("rename");
        }}
      >
        Rename
      </Item>
      <Item
        onClick={() => {
          handleItemClick("Add folder");
        }}
      >
        Add folder
      </Item>

      <Item
        disabled={!isPasteEnabled()}
        onClick={() => {
          handleItemClick("Paste");
        }}
      >
        Paste
      </Item>
      <Item
        onClick={() => {
          handleItemClick("export");
        }}
      >
        Export
      </Item>
      <Item
        onClick={() => {
          handleItemClick("delete");
        }}
      >
        Delete
      </Item>
    </Menu>
  );

  const showSafeMenu = (e) => {
    e.preventDefault();
    contextMenu.show({ id: SAFE_MENU_ID, event: e });
  };

  const showFolderMenu = (e) => {
    e.preventDefault();
    contextMenu.show({ id: FOLDER_MENU_ID, event: e });
  };

  const menu = props.isSafe ? safeMenu : folderMenu;
  //    const style = props.color ? { stroke: props.color } : {};

  return (
    <>
      <div
        className="menu-dots"
        onClick={props.isSafe ? showSafeMenu : showFolderMenu}
      >
        <svg width="24" height="24" className="safe_pane_icon">
          <use href="#el-dots"></use>
        </svg>
      </div>
      {menu}
    </>
  );
}

export default FolderMenu;
