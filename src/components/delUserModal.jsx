import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import axios from "axios";
import { getApiUrl, getVerifier } from "../lib/utils";

import ModalCross from "./modalCross";

function DelUserModal(props) {

  const [errorMsg, setErrorMsg] = useState("");

  const queryClient = useQueryClient();

  const deleteUserAction = () => {
    return axios
      .post(`${getApiUrl()}iam.php`, {
        verifier: getVerifier(),
        operation: "delete",
        email: props.data.email,
        id: props.data.id,
      })
      .then((result) => {
        console.log('delUserModal result', result)
        if (result.data.status === "Ok") {
          return "Ok";
        }
        if (result.data.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        self.setState({ errorMsg: result.data.status });
      })
      .catch((error) => {
        setErrorMsg("Server error. Please try again later");
      });
  };

  const deleteUserMutation = useMutation({
    mutationFn: deleteUserAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userList"], exact: true });
      props.onClose();
    },
  })

  const submit = () => {
    deleteUserMutation.mutate();
  };

  return (
    <Modal
      show={props.data.show}
      onHide={props.onClose}
      animation={false}
      centered
    >
      <ModalCross onClose={props.onClose}></ModalCross>
      <div className="modalTitle">
        <div className="h2">Delete User Account</div>
      </div>

      <Modal.Body>
        <div>email: {props.data.email}</div>
        <div>id: {props.data.id}</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={props.onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Ok</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DelUserModal;
