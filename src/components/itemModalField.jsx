

/* plain text fuels for item modals

props:
    name - label text
    idName - unique html element id for input field
    onChane - callback on input change
    edit - item modal dialog edit mode
*/

import ItemModalFieldNav from "./itemModalFieldNav";
import { copyToClipboard, startCopiedTimer } from "../lib/copyToClipboard";


function ItemModalField(props) {

    return (
        <div
            className="itemModalField"
            style={{
                marginBottom: 32,
                position: "relative",
                display: "flex",
                alignItems: "center",
            }}
        >
            <div
                style={{ flexGrow: 1 }}
                onClick={() => {
                    if (!props.edit) {
                        copyToClipboard(props.value);
                        document.querySelector(`#${props.idName}-copied`).style.display = "flex";
                        startCopiedTimer();
                    }
                }}
            >
                <ItemModalFieldNav
                    copy={!props.edit}
                    name={props.name}
                    htmlFor={props.idName}
                />
                <div>
                    <input
                        id={props.idName}
                        onChange={props.onChange}
                        readOnly={!props.edit}
                        spellCheck={false}
                        value={props.value}
                        autoComplete="off"
                        placeholder={""}
                    ></input>
                    <div className="copied" id={`${props.idName}-copied`}>
                        <div>Copied &#10003;</div>
                    </div>
                </div>
            </div>
        </div >

    )
}

export default ItemModalField;
