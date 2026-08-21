import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

function PasskeySelectModal(props) {
  return (
    <Modal show={props.show} onHide={props.onCancel} animation={false} centered>
      <Modal.Header closeButton>
        <Modal.Title>Choose a passkey</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          Select the account to use for <strong>{props.rpId}</strong>.
        </div>
        <div className="d-grid gap-2">
          {props.passkeys.map(item => (
            <Button
              key={item._id}
              variant="outline-secondary"
              className="text-start p-3"
              onClick={() => props.onSelect(item)}
            >
              <div style={{ fontWeight: 600 }}>
                {item.cleartext?.[0] || item.cleartext?.[2] || "Passkey"}
              </div>
              {item.cleartext?.[2] && (
                <div style={{ opacity: 0.75 }}>{item.cleartext[2]}</div>
              )}
              <div style={{ opacity: 0.6, fontSize: "0.875rem" }}>
                {item.cleartext?.[3] || item.passkey?.rpId}
              </div>
            </Button>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onCancel}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PasskeySelectModal;