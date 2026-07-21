// see https://gist.github.com/chinchang/8106a82c56ad007e27b1
function xmlToJson(xml) {
  // Create the return object
  let obj = {};
  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let j = 0; j < xml.attributes.length; j++) {
        const attribute = xml.attributes.item(j);
        obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  // If just one text node inside
  if (xml.hasChildNodes() && xml.childNodes.length === 1 && xml.childNodes[0].nodeType === 3) {
    obj = xml.childNodes[0].nodeValue;
  } else if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      const item = xml.childNodes.item(i);
      const { nodeName } = item;
      if (typeof obj[nodeName] == 'undefined') {
        if (item.nodeType != 3) {
          obj[nodeName] = xmlToJson(item);
        }
      } else {
        if (typeof obj[nodeName].push == 'undefined') {
          const old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

function importEntry(entry) {
  const result = {};
  const strings = make_array(entry.String);
  for (let s = 0; s < strings.length; s++) {
    if ((strings[s].Key !== undefined) && (strings[s].Value !== undefined)) {
      result[strings[s].Key] = strings[s].Value;
    }
  }

  const options = {};

  let cleartext;
  if ('card_num' in result) { // version 5 as of today
    cleartext = [
      "card",
      (typeof result.Title === 'string') ? result.Title : 'unnamed',
      (typeof result.Notes === 'string') ? result.Notes : '',
      (typeof result.card_num === 'string') ? result.card_num : '',
      (typeof result.card_name === 'string') ? result.card_name : '',
      (typeof result.exp_month === 'string') ? result.exp_month : '',
      (typeof result.exp_year === 'string') ? result.exp_year : '',
      (typeof result.card_code === 'string') ? result.card_code : '',
    ];
    options.version = 5;
  } else if ('streetAddress1' in result) { // version 5 as of today
    cleartext = [
      "addr",
      (typeof result.Title === 'string') ? result.Title : 'unnamed',
      (typeof result.Notes === 'string') ? result.Notes : '',
      (typeof result.streetAddress1 === 'string') ? result.streetAddress1 : '',
      (typeof result.streeAddress2 === 'string') ? result.streeAddress2 : '',
      (typeof result.city === 'string') ? result.city : '',
      (typeof result.state === 'string') ? result.state : '',
      (typeof result.zip === 'string') ? result.zip : '',
      (typeof result.country === 'string') ? result.country : '',
    ];
    options.version = 5;
  }



  else {
    result.URL = (typeof result.URL === 'string') ? result.URL : '';
    if (typeof result.KP2A_URL === 'string') {
      result.URL = [result.URL, result.KP2A_URL].join('\x01')
    }

    cleartext = [
      (typeof result.Title === 'string') ? result.Title : 'unnamed',
      (typeof result.UserName === 'string') ? result.UserName : '',
      (typeof result.Password === 'string') ? result.Password : '',
      result.URL,
      (typeof result.Notes === 'string') ? result.Notes : '',
    ];

    if (typeof result.TOTP === 'string') {
      cleartext.push(result.TOTP);
    }
    if ((typeof result.Note === 'string') && (result.Note === '1')) {
      options.note = 1;
    }
  }




  // check_limits_on_import(cleartext); // raises exception



  if (entry.hasOwnProperty('Times') && entry.Times.hasOwnProperty('LastModificationTime')) {
    options.lastModified = entry.Times.LastModificationTime;
  }
  return { cleartext, options };
}

function make_array(property) {
  if (property === undefined) {
    return [];
  }
  if (Array.isArray(property)) {
    return property;
  }
  const result = [];
  result.push(property);
  return result;
}

function getEntries(group) {
  const entries = make_array(group.Entry);
  const result = [];
  for (let e = 0; e < entries.length; e++) {
    result.push(importEntry(entries[e]));
  }
  return result;
}

function getFolders(group) {
  const groups = make_array(group.Group);
  const result = [];
  for (let i = 0; i < groups.length; i++) {
    result.push(importGroup(groups[i]));
  }
  return result;
}

function importGroup(group) {
  return {
    name: group.Name,
    items: getEntries(group),
    folders: getFolders(group),
  };
}

function importXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  if (xmlDoc.firstElementChild.nodeName === 'KeePassFile') {
    const kpf = xmlDoc.firstElementChild;
    const result = xmlToJson(kpf);

    if ((result.Root.Group === undefined) || (Array.isArray(result.Root.Group) == true)) {
      throw new Error('not a KeePass or Passhub XML file');
    }
    const imported = importGroup(result.Root.Group);
    imported.name = result.Root.Group.Name;
    if (imported.name === undefined) {
      imported.name = 'KeePass';
    }
    return imported;
  }
  throw new Error('not a KeePass or Passhub XML file');
}

export default importXML;
