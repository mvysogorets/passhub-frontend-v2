import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import ModalCross from "./modalCross";
import { logMeOut } from "../lib/utils";


function IdleModal(props) {

  if (!props.show) {
    return null;
  }

  const onLogout = () => {
    logMeOut();
  };

  return (
    <Modal
      show={props.show}
      onHide={props.onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle">
        <div className="h2">You have not used the site for a while</div>
      </div>

      <Modal.Body>
        <p>
          For your security, your connection will be closed if there is no
          activity within one minute. Would you like to extend your
          connection?
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onClose}>
          Extend
        </Button>
        <Button onClick={onLogout}>Logout</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default IdleModal;
