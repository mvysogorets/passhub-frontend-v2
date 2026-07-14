import React, { useRef, useEffect } from "react";

import { saveAs } from "file-saver";

function ViewFile(props) {

  if (!props.show) {
    return null;
  }

  let ext = "";

  const imgRef = React.createRef();
  const iframeRef = React.createRef();


  const mounted = useRef();

  // it is impossible to understand, only to believe

  useEffect(() => {
    if (!mounted.current) {
      // do componentDidMount logic
      drawIFrame();
      mounted.current = true;
    } else {
      drawIFrame();
      // do componentDidUpdate logic
    }
  });

  // const componentDidUpdate = () => {
  const drawIFrame = () => {
    if (props.show) {
      if (["pdf", "txt", "csv", "json", "js", "md", "css"].includes(ext)) {
        const obj_url = URL.createObjectURL(props.blob);
        iframeRef.current.setAttribute("src", obj_url);
        URL.revokeObjectURL(obj_url);
        //    this.forceUpdate();
      } else if (ext != "") {
        const reader = new FileReader();
        reader.addEventListener(
          "load",
          function () {
            const imgElement = imgRef.current;
            imgElement.src = reader.result;
            imgElement.onload = function () {
              const { naturalHeight, naturalWidth } = imgElement;
              const { width, height } = imgElement.parentElement;
              console.log(naturalHeight, naturalWidth);
              console.log(width, height);
            };
            // set_size();
            //     this.forceUpdate();
          },
          false
        );
        reader.readAsDataURL(props.blob);
      }
    }
  };

  const download = () => {
    saveAs(props.blob, props.filename);
  };

  const { filename } = props;

  const dot = filename.lastIndexOf(".");
  ext = filename.substring(dot + 1).toLowerCase();

  return (
    <div className="file-view-page" style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: "100vw" }}
    >
      <div className="view-file-cross" onClick={props.gotoMain}>
        <svg width="40" height="40">
          <use href="#f-cross"></use>
        </svg>
      </div>
      <div
        className="d-sm-none"
        style={{
          display: "flex",
          alignItems: "center",
          margin: "0 16px 0 72px",
          padding: "16px 0 16px 0",
        }}
      >
        <div className="view-file-filename">{filename}</div>
        {ext !== "pdf" && (
          <button
            onClick={download}
            className="btn btn-as-span"
            style={{
              background: "white",
              borderRadius: "12px",
              width: "48px",
            }}
          >
            <svg width="24" height="24" fill="none" stroke="black">
              <use href="#f-simple-download"></use>
            </svg>
          </button>
        )}
      </div>
      <div
        className="d-none d-sm-flex"
        style={{
          alignItems: "center",
          margin: "0 72px",
          padding: "20px 0 16px 0",
        }}
      >
        <div className="view-file-filename">{filename}</div>
        {ext !== "pdf" && (
          <button
            onClick={download}
            className="btn btn-as-span"
          >
            <svg width="24" height="24" fill="none" stroke="black">
              <use href="#f-simple-download"></use>
            </svg>
            Download
          </button>
        )}
      </div>
      {["pdf", "txt", "csv", "json", "js", "md", "css"].includes(ext) ? (
        < div
          className="img-frame"
          style={{ flexGrow: 1, background: (ext == "pdf") ? "none" : "white" }}
        >
          <iframe
            ref={iframeRef}
            style={{ width: "100%", height: "100%" }}
          ></iframe>
        </div>
      ) : (
        <div
          className="img-frame"
          style={{
            flexGrow: 1,
            background: "none",
            overflow: "hidden",
            marginBottom: "32px",
          }}
        >
          <img
            ref={imgRef}
            style={{
              maxHeight: "100%",
              maxWidth: "100%",
              margin: "0 auto",
              boxShadow: "0px 10px 35px rgba(0, 0, 0, 0.2)",
            }}
          ></img>
        </div>
      )
      }
    </div >
  );
}

export default ViewFile;
