import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

import axios from "axios";

import * as passhubCrypto from "../lib/crypto";
import { copyToClipboard, startCopiedTimer } from "../lib/copyToClipboard";
import { getApiUrl, getVerifier, atRecordsLimits } from "../lib/utils";
import ItemModalFieldNav from "./itemModalFieldNav";
import ItemModalField from "./itemModalField";
import Eye from "./eye";

import ItemModal from "./itemModal";
import { ButtonGroup } from "react-bootstrap";

const maxStreetAddress1Length = 240;
const maxStreetAddress2Length = 240;
const maxStateLength = 240;
const maxZipLength = 240;
const maxCountryLength = 240;

function AddressModal(props) {

  if (!props.show) {
    return null;
  }

  function itemToState(item) {  // history

    let _streetAddress1 = "";
    let _streetAddress2 = "";
    let _city = "";
    let _state = "";
    let _zip = "";
    let _country = "";

    if (item) {
      _streetAddress1 = item.cleartext[3];
      _streetAddress2 = item.cleartext[4];
      _city = item.cleartext[5];
      _state = item.cleartext[6];
      _zip = item.cleartext[7];
      _country = item.cleartext[8];
    }

    return { _streetAddress1, _streetAddress2, _city, _state, _zip, _country }
  }

  let _edit = props.args.item ? false : true;

  const { _streetAddress1, _streetAddress2, _city, _state, _zip, _country } = itemToState(props.args.item);

  const [edit, setEdit] = useState(_edit);
  const [streetAddress1, setStreetAddress1] = useState(_streetAddress1);
  const [streetAddress2, setStreetAddress2] = useState(_streetAddress2);
  const [city, setCity] = useState(_city);
  const [state, setState] = useState(_state);
  const [zip, setZip] = useState(_zip);
  const [country, setCountry] = useState(_country);
  const [errorMsg, setErrorMsg] = useState("");
  const [newItemId, setNewItemId] = useState(null);



  /* addrMutation */

  const queryClient = useQueryClient();

  const addrAction = (args) => {
    //     console.log('card Action: url', args.url,  'args', args.args);
    return axios
      .post(`${getApiUrl()}${args.url}`, args.args)
      .then((response) => {
        const result = response.data;

        if (result.status === "Ok") {
          if (result.firstID) {
            setNewItemId(result.firstID);
            props.newItemInd(result.firstID);
          }

          //props.onClose(true, result.id);
          setEdit(false);
          return "Ok";
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

  const addrMutation = useMutation({
    mutationFn: addrAction,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["userData"], exact: true })
    },
  })

  /* end addrMutation */


  const onEdit = () => {
    setEdit(true);
  };

  const onClose = () => {
    props.onClose();
  };

  const toggleCSC = () => {
    setHideCSC(!hideCSC);
  };

  const toggleCardNumber = () => {
    setHideCardNumber(!hideCardNumber);
  };

  const onStreetAddress1Change = (e) => {
    const value = e.target.value.substring(0, maxStreetAddress1Length);
    setStreetAddress1(value);
    setErrorMsg("");
  };

  const onStreetAddress2Change = (e) => {
    const value = e.target.value.substring(0, maxStreetAddress2Length);
    setStreetAddress2(value);
    setErrorMsg("");
  };


  const onCityChange = (e) => {
    const value = e.target.value.substring(0, maxStateLength);
    setCity(value);
    setErrorMsg("");
  };

  const onStateChange = (e) => {
    const value = e.target.value.substring(0, maxStateLength);
    setState(value);
    setErrorMsg("");
  };

  const onZipChange = (e) => {
    const value = e.target.value.substring(0, maxZipLength);
    setZip(value);
    setErrorMsg("");
  };

  const onCountryChange = (e) => {
    const value = e.target.value.substring(0, maxCountryLength);
    setCountry(value);
    setErrorMsg("");
  };


  const onSubmit = (title, note) => {
    const pData = [
      "addr",
      title,
      note,
      streetAddress1,
      streetAddress2,
      city,
      state,
      zip,
      country
    ];

    const safe = props.args.safe;

    const aesKey = safe.bstringKey;
    const SafeID = safe.id;

    let folderID = 0;
    if (props.args.item) {
      folderID = props.args.item.folder;
    } else if (props.args.folder.safe) {
      folderID = props.args.folder.id;
    }
    const eData = passhubCrypto.encryptItem(pData, aesKey, { version: 5 });
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
    addrMutation.mutate({ url: 'items.php', args: data })
    //props.iteMutation.mutate({ url: 'items.php', args: data });
  };


  function onHistoryItemChange(item) {

    const { _streetAddress1, _streetAddress2, _city, _state, _zip, _country } = itemToState(item);
    setStreetAddress1(_streetAddress1);
    setStreetAddress2(_streetAddress2);
    setCity(_city);

    setState(_state);
    setZip(_zip);
    setCountry(_country);
  }

  return (
    <ItemModal
      show={props.show}
      args={props.args}
      onClose={props.onClose}
      onCloseSetFolder={props.onCloseSetFolder}
      onEdit={onEdit}
      onSubmit={onSubmit}
      onHistoryItemChange={onHistoryItemChange}
      edit={edit}
      errorMsg={errorMsg}
    >

      <ItemModalField
        name="Street Address 1"
        idName="street-address1"
        edit={edit}
        value={streetAddress1}
        onChange={onStreetAddress1Change}
      />

      <ItemModalField
        name="Street Address 2"
        idName="street-address2"
        edit={edit}
        value={streetAddress2}
        onChange={onStreetAddress2Change}
      />

      <ItemModalField
        name="City"
        idName="city"
        edit={edit}
        value={city}
        onChange={onCityChange}
      />


      <ItemModalField
        name="State"
        idName="state"
        edit={edit}
        value={state}
        onChange={onStateChange}
      />

      <ItemModalField
        name="Zip"
        idName="zip"
        edit={edit}
        value={zip}
        onChange={onZipChange}
      />

      <ItemModalField
        name="Country"
        idName="country"
        edit={edit}
        value={country}
        onChange={onCountryChange}
      />

    </ItemModal >
  );
}

export default AddressModal;

