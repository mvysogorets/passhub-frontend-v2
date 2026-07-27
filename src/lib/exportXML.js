import * as utils from "./utils";

let xml = '';

function dump_item(item, indent) {
  if (item.hasOwnProperty('file')) {
    return;
  }

  xml += indent + '<Entry>\r\n';
  const id1 = indent + '    ';
  const id2 = id1 + '    ';

  if (item.hasOwnProperty('lastModified')) {
    xml += id1 + '<Times>\r\n';
    xml += id2 + '<LastModificationTime>' + utils.escapeHtml(item.lastModified) + '</LastModificationTime>\r\n';
    xml += id1 + '</Times>\r\n';
  }

  let title, username, password, url, notes;

  if (item.version != 5) {

    title = item.cleartext[0];
    username = item.cleartext[1];
    password = item.cleartext[2];
    url = item.cleartext[3];
    notes = item.cleartext[4];
    let urls = item.cleartext[3].split('\x01');


    if (notes != '') {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>Notes</Key>\r\n';
      xml += id2 + '<Value>' + utils.escapeHtml(notes) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }

    if (password != '') {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>Password</Key>\r\n';
      xml += id2 + '<Value ProtectInMemory="True">' + utils.escapeHtml(password) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }
    if (title != '') {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>Title</Key>\r\n';
      xml += id2 + '<Value>' + utils.escapeHtml(title) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }
    if (url != '') {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>URL</Key>\r\n';
      xml += id2 + '<Value>' + utils.escapeHtml(urls[0]) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }
    if (username != '') {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>UserName</Key>\r\n';
      xml += id2 + '<Value>' + utils.escapeHtml(username) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }
    if (item.hasOwnProperty('note')) {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>Note</Key>\r\n';
      xml += id2 + '<Value>' + 1 + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }
    if (item.cleartext.length == 6) {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>TOTP</Key>\r\n';
      xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[5]) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }

    // KeepassXC naming

    for (let i = 1; i < urls.length; i++) {
      xml += id1 + '<String>\r\n';
      if (i == 1) {
        xml += id2 + `<Key>KP2A_URL</Key>\r\n`;
      } else {
        xml += id2 + `<Key>KP2A_URL_${i - 1}</Key>\r\n`;
      }
      xml += id2 + '<Value>' + utils.escapeHtml(urls[i]) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }

    xml += indent + '</Entry>\r\n';
    return;
  }

  // else version 5
  title = item.cleartext[1];
  username = '';
  password = '';
  url = '';
  notes = item.cleartext[2];

  if (notes != '') {
    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>Notes</Key>\r\n';
    xml += id2 + '<Value>' + utils.escapeHtml(notes) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';
  }

  if (title != '') {
    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>Title</Key>\r\n';
    xml += id2 + '<Value>' + utils.escapeHtml(title) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';
  }

  if (item.cleartext[0] == "card") {
    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>card_code</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[7]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>card_name</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[4]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>card_num</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[3]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>exp_month</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[5]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>exp_year</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[6]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    if (item.cleartext.length > 8) {
      xml += id1 + '<String>\r\n';
      xml += id2 + '<Key>zip</Key>';
      xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[7]) + '</Value>\r\n';
      xml += id1 + '</String>\r\n';
    }
  }

  if (item.cleartext[0] == "addr") {
    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>streetAddress1</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[3]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>streetAddress2</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[4]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>city</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[5]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>state</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[6]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>zip</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[7]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';

    xml += id1 + '<String>\r\n';
    xml += id2 + '<Key>country</Key>';
    xml += id2 + '<Value>' + utils.escapeHtml(item.cleartext[8]) + '</Value>\r\n';
    xml += id1 + '</String>\r\n';
  }


  xml += indent + '</Entry>\r\n';
}

function exportFolder(folder, indent) {
  xml += indent + '<Group>\r\n';
  if (folder.safe) {
    xml += indent + '    <Name>' + utils.escapeHtml(folder.cleartext[0]) + '</Name>\r\n';
  } else {
    xml += indent + '    <Name>' + utils.escapeHtml(folder.name) + '</Name>\r\n';
  }

  for (let i = 0; i < folder.items.length; i++) {
    dump_item(folder.items[i], indent + '    ');
  }

  for (let i = 0; i < folder.folders.length; i++) {
    exportFolder(folder.folders[i], indent + '    ');
  }
  xml += indent + '</Group>\r\n';
}

function exportXML(folder) {
  xml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>\r\n<KeePassFile>\r\n    <Root>\r\n';
  xml += '        <Group>\r\n';
  xml += '            <Name>Passhub</Name>\r\n';

  if (Array.isArray(folder)) {
    for (let s = 0; s < folder.length; s++) {
      if (folder[s].user_role != "limited view") {
        exportFolder(folder[s], '            ');
      } else {
        console.log('limited view safe not exported');
      }
    }
  } else {
    if (folder.user_role != "limited view") {
      exportFolder(folder, '            ');
    } else {
      console.log('limited view safe not exported');
    }
  }
  xml += '        </Group>\r\n';
  xml += '     </Root>\r\n</KeePassFile>\r\n';

  const blob = new Blob([xml], { type: 'text/xml' });
  return blob;
}

export default exportXML;
