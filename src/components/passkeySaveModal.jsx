import { useEffect, useState } from "react";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

import * as passhubCrypto from "../lib/crypto";
import PasskeyGenerator from "../lib/passkey-generator.js";
import { encodePasskeyCleartext, hasExcludedPasskey, isDirectWritableSafe } from "../lib/passkey";
import { getApiUrl, getVerifier, limits } from "../lib/utils";

function PasskeySaveModal(props) {
  const writableSafes = props.safes.filter(isDirectWritableSafe);
  const [safeId, setSafeId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recordName, setRecordName] = useState("");

  useEffect(() => {
    if (!props.show) return;

    const currentSafe = writableSafes.find(safe => String(safe.id) === String(props.currentSafeId));
    setSafeId(String(currentSafe?.id ?? writableSafes[0]?.id ?? ""));
    setRecordName(
      (props.options?.siteName || props.options?.rpId || "")
        .slice(0, limits.MAX_TITLE_LENGTH)
    );
    setError("");
    setSaving(false);
  }, [props.show, props.currentSafeId, props.safes]);

  const save = async () => {
    const safe = writableSafes.find(item => String(item.id) === safeId);
    if (!safe || !props.options) return;

    const name = recordName.trim();
    if (!name) {
      setError("Please set a name");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (hasExcludedPasskey(
        props.safes,
        props.options.rpId,
        props.options.excludeCredentials
      )) {
        throw new DOMException(
          "This PassHub credential is already registered for the relying party",
          "InvalidStateError"
        );
      }

      if (!PasskeyGenerator?.createPasskey) {
        throw new Error("Passkey generator is not available");
      }

      const passkey = await PasskeyGenerator.createPasskey(
        name,
        props.options.userName,
        props.options.rpId,
        safe.bstringKey,
        props.options.userHandle,
        props.options.algorithm
      );
      const encryptedData = passhubCrypto.encryptItem(
        encodePasskeyCleartext(passkey.cleartext, passkey.passkey),
        safe.bstringKey,
        {
          version: 6,
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
        props.onError("PassHub session expired");
        window.location.href = "expired.php";
        return;
      }
      if (result.status !== "Ok") {
        throw new Error(result.status || "Passkey could not be saved");
      }

      props.onSaved(passkey);
    } catch (saveError) {
      if (saveError?.name === "InvalidStateError") {
        props.onError(saveError);
        return;
      }
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
          Create and save the passkey for <strong>{props.options?.rpId}</strong> in:
        </div>
        <Form.Group className="mb-3" controlId="passkeyName">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={recordName}
            maxLength={limits.MAX_TITLE_LENGTH}
            onChange={event => setRecordName(event.target.value)}
            disabled={saving}
            autoFocus
          />
        </Form.Group>
        <Form.Label htmlFor="passkeySafe">Safe</Form.Label>
        <Form.Select
          id="passkeySafe"
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
        <Button variant="primary" onClick={save} disabled={!safeId || !recordName.trim() || saving}>
          {saving ? "Creating..." : "Create and save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PasskeySaveModal;
