import { useEffect, useState } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

import * as passhubCrypto from "../lib/crypto";
import { getApiUrl, getVerifier } from "../lib/utils";

function PasskeySaveModal(props) {
  const writableSafes = props.safes.filter(
    safe => safe.bstringKey && safe.user_role !== "limited view"
  );
  const [safeId, setSafeId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.show) return;

    const currentSafe = writableSafes.find(safe => String(safe.id) === String(props.currentSafeId));
    setSafeId(String(currentSafe?.id ?? writableSafes[0]?.id ?? ""));
    setError("");
    setSaving(false);
  }, [props.show, props.currentSafeId, props.safes]);

  const save = async () => {
    const safe = writableSafes.find(item => String(item.id) === safeId);
    if (!safe || !props.passkey) return;

    setSaving(true);
    setError("");

    try {
      const encryptedPrivateKey = passhubCrypto.encryptItem(
        [props.passkey.passkey.privateKey],
        safe.bstringKey,
        {}
      );
      const passkeyMetadata = {
        ...props.passkey.passkey,
        privateKey: encryptedPrivateKey,
      };
      const encryptedData = passhubCrypto.encryptItem(
        props.passkey.cleartext,
        safe.bstringKey,
        {
          version: 6,
          type: "passkey",
          passkey: passkeyMetadata,
        }
      );
      const response = await axios.post(`${getApiUrl()}items.php`, {
        verifier: getVerifier(),
        vault: safe.id,
        folder: 0,
        encrypted_data: encryptedData,
      });
      const result = response.data;

      if (result.status === "login") {
        window.location.href = "expired.php";
        return;
      }
      if (result.status !== "Ok") {
        throw new Error(result.status || "Passkey could not be saved");
      }

      props.onSaved();
    } catch (saveError) {
      const message = saveError.message || "Server error. Please try again later";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <Modal show={props.show} onHide={props.onCancel} animation={false} centered>
      <Modal.Header closeButton>
        <Modal.Title>Save passkey</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          Save the passkey for <strong>{props.passkey?.passkey?.rpId}</strong> in:
        </div>
        <Form.Select
          aria-label="Safe"
          value={safeId}
          onChange={event => setSafeId(event.target.value)}
          disabled={saving}
        >
          {writableSafes.map(safe => (
            <option key={safe.id} value={safe.id}>{safe.name}</option>
          ))}
        </Form.Select>
        {!writableSafes.length && (
          <div className="text-danger mt-3">No writable safe is available.</div>
        )}
        {error && <div className="text-danger mt-3">{error}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={props.onCancel} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={!safeId || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PasskeySaveModal;