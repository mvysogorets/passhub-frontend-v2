import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import axios from "axios";

import * as passhubCrypto from "../lib/crypto";
import { getApiUrl, getVerifier, atRecordsLimits } from "../lib/utils";
import { getUserData } from "../lib/userData";


import ItemModal from "./itemModal";


// import PlanLimitsReachedModal from "./planLimitsReachedModal";
// import UpgradeModal from "./upgradeModal";


function NoteModal(props) {

  if (!props.show) {
    return null;
  }

  const [errorMsg, setErrorMsg] = useState("");
  const [edit, setEdit] = useState(props.args.item ? false : true);
  const [newItemId, setNewItemId] = useState(null);

  const noteAction = (args) => {
    //    console.log('note Action: url', args.url, 'args', args.args);
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          if (result.firstID) {
            setNewItemId(result.firstID);
            props.newItemInd(result.firstID);
          }

          //          props.onClose(true, result.id);
          setEdit(false);
          return queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })

          //          return "Ok";
        }
        if (result.status === "login") {
          window.location.href = "expired.php";
          return;
        }
        setErrorMsg(result.status);
        return;
      })
      .catch((err) => {
        console.log(err);
        setErrorMsg("Server error. Please try again later");
      });
  }

  const queryClient = useQueryClient();

  const noteMutation = useMutation({
    mutationFn: noteAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
    },
  })

  const onClose = () => {
    props.onClose();
  };

  const onSubmit = async (title, note) => {
    const pData = [title, "", "", "", note];
    const options = { note: 1 };

    const safe = props.args.safe;

    const aesKey = safe.subtleKey;
    const SafeID = safe.id;

    let folderID = 0;
    if (props.args.item) {
      folderID = props.args.item.folder;
    } else if (props.args.folder.safe) {
      folderID = props.args.folder.id;
    }

    const eData = await passhubCrypto.encryptItem(pData, aesKey, options);
    const data = {
      verifier: getVerifier(),
      vault: SafeID,
      folder: folderID,
      encrypted_data: eData,
    }

    if (props.args.item) {
      data.entryID = props.args.item._id;
    } else if (newItemId) {
      data.entryID = newItemId;
    }

    noteMutation.mutate({ url: 'items.php', args: data });
    return;
  };


  if (typeof props.args.item == "undefined") {
    if (atRecordsLimits()) {
      return (
        <UpgradeModal
          show={props.show}
          accountData={getUserData()}
          onClose={props.onClose}
        ></UpgradeModal>
      );
      /*
              
              return (
                <PlanLimitsReachedModal
                  show={this.props.show}
                  onClose={this.props.onClose}
                ></PlanLimitsReachedModal>
              );
      */
    }
  }

  const onEdit = () => {

    setEdit(true);
  };

  return (
    <ItemModal
      show={props.show}
      args={props.args}
      onClose={props.onClose}
      onCloseSetFolder={props.onCloseSetFolder}
      onSubmit={onSubmit}
      onEdit={onEdit}
      edit={edit}
      errorMsg={errorMsg}
      isNote
    ></ItemModal>
  );
}

export default NoteModal;
