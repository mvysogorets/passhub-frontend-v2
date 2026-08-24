import { fromArrays } from './csv';

let csv='';


function exportFolder(folder) {
  const path = folder.path.join('/');
  for (let i = 0; i < folder.items.length; i++) {
    if (folder.items[i].hasOwnProperty('file')) {
      continue;
    }
    // bitwarden compatible
    let urls = folder.items[i].cleartext[3].split('\x01');
    urls = urls.join(' ');
    csv += fromArrays([[path,
      folder.items[i].cleartext[0],
      folder.items[i].cleartext[1],
      folder.items[i].cleartext[2],
      urls,
      folder.items[i].cleartext[4]]]);
  }
  for (let f = 0; f < folder.folders.length; f++) {
    exportFolder(folder.folders[f]);
  }
}

function exportCSV(folder) {
  csv = 'path,title,username,password,url,notes\r\n';

  if (Array.isArray(folder)) {
    for (let s = 0; s < folder.length; s++) {
      if(folder[s].user_role != "limited view") {
        exportFolder(folder[s]);
      } else {
        console.log('limited view safe not exported');
      }
    }
  } else {
    if(folder.user_role != "limited view") {
      exportFolder(folder);
    } else {
      console.log('limited view safe not exported');
    }
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  return blob;
}

export default exportCSV;
