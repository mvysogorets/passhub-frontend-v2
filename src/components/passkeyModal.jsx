import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import * as passhubCrypto from "../lib/crypto";
import { isDirectWritableSafe } from "../lib/passkey";
import { getApiUrl, getVerifier } from "../lib/utils";
import ItemModal from "./itemModal";
import ItemModalFieldNav from "./itemModalFieldNav";

function PasskeyModal(props) {
  const item = props.args.item;
  const safe = props.args.safe;
  const [edit, setEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: data => axios.post(`${getApiUrl()}items.php`, data),
    onSuccess: response => {
      const result = response.data;
      if (result.status === "login") {
        window.location.href = "expired.php";
        return;
      }
      if (result.status !== "Ok") {
        setErrorMsg(result.status || "Passkey could not be updated");
        return;
      }
      setEdit(false);
      setErrorMsg("");
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true });
    },
    onError: () => setErrorMsg("Server error. Please try again later"),
  });

  if (!props.show || !item) return null;

  const onSubmit = (title, note) => {
    // cleartext[5] already holds the raw passkey JSON (rpId, credentialId, keys, counter...).
    // Keep it byte-for-byte: only title and note change.
    const cleartext = [...item.cleartext];
    cleartext[0] = title;
    cleartext[1] = note;

    const encryptedData = passhubCrypto.encryptItem(
      cleartext,
      safe.bstringKey,
      { version: 6 }
    )

    updateMutation.mutate({
      verifier: getVerifier(),
      vault: safe.id,
      folder: item.folder || 0,
      entryID: item._id,
      // expectedRevision: item.revision || 0,
      encrypted_data: encryptedData,
    });
  };

  const username = item.cleartext?.[2];
  const url = item.cleartext?.[4] || item.passkey?.rpId;
  const fields = [
    ["Username", item.cleartext?.[2]],
    ["Relying party", item.cleartext?.[4] || item.passkey?.rpId],
    //    ["Created", item.passkey?.created ? new Date(item.passkey.created).toLocaleString() : ""],
    //["Credential ID", item.passkey?.credentialId],
  ];

  return (
    <ItemModal
      show={props.show}
      args={props.args}
      onClose={props.onClose}
      onCloseSetFolder={props.onCloseSetFolder}
      onSubmit={onSubmit}
      onEdit={() => setEdit(true)}
      edit={edit}
      errorMsg={errorMsg}
      limitedView={!isDirectWritableSafe(safe)}
      disableCopy
    >
      <div className="itemNoteModalField" style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 32 }}>
          <ItemModalFieldNav name="Username" />
          <input style={{ border: "none", background: "transparent" }} readOnly value={username} />
        </div>
        <div>
          <ItemModalFieldNav name="Relying party" />
          <a href={url} style={{ color: "var(--body-color" }} target="_blank">{url}</a>
        </div>


        {/*fields.map(([label, value]) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <ItemModalFieldNav name={label} />
            <input className="lp" readOnly value={value || ""} />
          </div>
        ))*/}
      </div>
    </ItemModal>
  )
};


export default PasskeyModal;
