import React from "react";

function AddDropUp(props) {

  if(!props.show) {
    return null;
  }

  const handleBodyClick = (e) => {
    e.stopPropagation();
    //  console.log("body click");
  };

  const handleOuterClick = () => {
    // console.log("outer click");
    props.onClose();
  };

  const handleMenuCommand = (e, cmd) => {
    e.stopPropagation();
    props.onClose();
    props.handleAddClick(cmd);
  };
    
    const modalClasses = props.show ? "pmodal" : "pmodal d-none";

    return (
      <div className={modalClasses} onClick={handleOuterClick}>
        <div
          className="pmodal-body"
          onClick={handleBodyClick}
          style={{
            right: props.right,
            bottom: props.bottom,
            width: 271,
            background: "#1B1B26",
            borderRadius: "16px",
            color: "white",
            padding: "8px 8px 8px 20px",
          }}
        >
          <div
            className="addModalItem"
            onClick={(e) => handleMenuCommand(e, "Password")}
          >
            <svg
              width="24"
              height="24"
              style={{ marginRight: 10, verticalAlign: "text-bottom" }}
            >
              <use href="#f-key"></use>
            </svg>
            Password
          </div>
          <div
            className="addModalItem"
            onClick={(e) => handleMenuCommand(e, "Note")}
          >
            <svg
              width="24"
              height="24"
              style={{ marginRight: 10, verticalAlign: "text-bottom" }}
            >
              <use href="#f-note"></use>
            </svg>
            Note
          </div>
          <div
            className="addModalItem"
            onClick={(e) => handleMenuCommand(e, "File")}
          >
            <svg
              width="24"
              height="24"
              style={{ marginRight: 10, verticalAlign: "text-bottom" }}
            >
              <use href="#f-file"></use>
            </svg>
            File
          </div>
          <div
            className="addModalItem"
            onClick={(e) => handleMenuCommand(e, "Bank Card")}
          >
            <svg
              width="24"
              height="24"
              style={{
                marginRight: 10,
                verticalAlign: "text-bottom",
                fill: "white",
                opacity: "0.7",
              }}
            >
              <use href="#credit_card"></use>
            </svg>
            Bank Card
          </div>
          <div
            className="addModalItem"
            onClick={(e) => handleMenuCommand(e, "Folder")}
          >
            <svg
              width="24"
              height="24"
              style={{ marginRight: 10, verticalAlign: "text-bottom" }}
            >
              <use href="#f-folder"></use>
            </svg>
            Folder
          </div>
          <div style={{ height: "40px" }}></div>
          <div>
            <span
              onClick={props.onClose}
              style={{
                float: "right",
                width: "80px",
                height: "80px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <svg width="40" height="40">
                <use href="#f-cross"></use>
              </svg>
            </span>
          </div>
        </div>
      </div>
    );
}

export default AddDropUp;
