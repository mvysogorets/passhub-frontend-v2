

// thanks to Ben Nadel: 
// https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm

function CSVToArray(strData, strDelimiter) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    (
      // Delimiters.
      "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

      // Quoted fields.
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

      // Standard fields.
      "([^\"\\" + strDelimiter + "\\r\\n]*))"
    ),
    "gi"
  );


  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;


  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec(strData)) {

    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (
      strMatchedDelimiter.length &&
      (strMatchedDelimiter != strDelimiter)
    ) {

      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);

    }


    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {

      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      var strMatchedValue = arrMatches[2].replace(
        new RegExp("\"\"", "g"),
        "\""
      );

    } else {

      // We found a non-quoted value.
      var strMatchedValue = arrMatches[3];

    }


    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
  if (arrData.length > 0) {
    if ((arrData[arrData.length - 1].length === 1) && (arrData[arrData.length - 1] === '')) {
      arrData.pop();
    }
  }
  return (arrData);
}

function findFolder(folders, path) {
  for (let f = 0; f < folders.length; f++) {
    if (folders[f].name == path[0]) {
      if (path.length === 1) {
        return folders[f];
      }
      path.shift();
      return findFolder(folders[f].folders, path);
    }
  }
  // not found
  const folder = { name: path[0], folders: [], items: [] };
  folders.push(folder);
  if (path.length === 1) {
    return folder;
  }
  path.shift();
  return findFolder(folder.folders, path);
}

function addRecordToSafe(safe, record, path) {
  if (path.length === 0) {
    safe.items.push(record);
    return;
  }
  const folder = findFolder(safe.folders, path);
  folder.items.push(record);
}


function addRecord(safes, r, options = {}) {
  const path = r.shift().split('/');
  // check_limits_on_import(r); // raises exception
  for (let s = 0; s < safes.length; s++) {
    if (safes[s].name == path[0]) {
      path.shift();
      addRecordToSafe(safes[s], { cleartext: r, options }, path);
      return;
    }
  }
  // no such safe
  const safe = { name: path[0], folders: [], items: [] };
  safes.push(safe);
  path.shift();
  addRecordToSafe(safe, { cleartext: r, options }, path);
}


function monthToNumber(aMonth) {
  let month = aMonth.substring(0, 3).toLowerCase();
  const translation = {
    "jan": "01",
    "feb": "02",
    "mar": "03",
    "apr": "04",
    "may": "05",
    "jun": "06",
    "jul": "07",
    "aug": "08",
    "sep": "09",
    "oct": "10",
    "nov": "11",
    "dec": "12",
  }

  if (month in translation) {
    return translation[month];
  }
  return aMonth;
}

function importCSV(text) {

  let data = CSVToArray(text);

  const safes = [];

  const titles = data.shift();

  if (titles.length === 1) { // old dashline?
    const t = data.shift();
    data.unshift(t);
    if (t.length === 7) {
      data.forEach((e) => {
        if (e.length === 7) {
          const e1 = [titles[0], e[0], e[2], e[5], e[1], e[6]];
          addRecord(safes, e1);
        }
      });
      return safes;
    }
  }



  // 1Password CSV, Feb 2026
  // Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes

  if ((titles.length === 9)
    && (titles[0] === 'Title')
    && (titles[1] === 'Url')
    && (titles[2] === 'Username')
    && (titles[3] === 'Password')
    && (titles[4] === 'OTPAuth')
    && (titles[5] === 'Favorite')
    && (titles[6] === 'Archived')
    && (titles[7] === 'Tags')
    && (titles[8] === 'Notes')
  ) {

    const path = "1Password";

    data.forEach((e) => {
      if (e.length === 9) {  // skip empty lines

        let notes = '';
        if (e[7].length > 0) {
          notes = `tags: ${e[7]}`;
          notes += '\n\n';
        }
        notes += e[8];
        const title = (e[0] !== "") ? e[0] : "unnamed";

        const record = [path, title, e[2], e[3], e[1], notes];
        if (e[4] != '') {
          let otp = e[4];
          const match = e[4].match(/secret=(.+?)&period/);
          if (match && (match.length > 1)) {
            otp = match[1];
          }
          record.push(otp);
        }
        addRecord(safes, record);
      }
    });
    return safes;
  }

  // Dashlane credentials.csv: username,username2,username3,title,password,note,url,category,otpSecret
  if ((titles.length === 9)
    && (titles[0] === 'username')
    && (titles[1] === 'username2')
    && (titles[2] === 'username3')
    && (titles[3] === 'title')
    && (titles[4] === 'password')
    && (titles[5] === 'note')
    && (titles[6] === 'url')
    && (titles[7] === 'category')
    && (titles[8] === 'otpSecret')
  ) {
    data.forEach((e) => {
      if (e.length === 9) {
        let title = e[3] == '' ? 'unnamed' : e[3];
        let path = e[7] == '' ? 'dashlane' : `dashlane/${e[7]}`;
        addRecord(safes, [path, title, e[0], e[4], e[6], e[5]]);
      }
    });
    return safes;
  }

  // url,username,password,totp, extra,name,grouping,fav -- new lastpass
  if ((titles.length === 8)
    && (titles[0] === 'url')
    && (titles[1] === 'username')
    && (titles[2] === 'password')
    && (titles[3] === 'totp')
    && (titles[4] === 'extra')
    && (titles[5] === 'name')
    && (titles[6] === 'grouping')
    && (titles[7] === 'fav')) {


    data.forEach((e) => {

      if (e.length === 8) {

        const extra1 = e[6].replaceAll('\\', '/');
        const path = extra1 == '' ? 'lastpass' : `lastpass/${extra1}`;

        let options = {};

        if ((e[0] == "http://sn") && (e[1] == "") && (e[2] == "")) {
          options = { note: 1 };

          if (e[4].startsWith('NoteType:Credit Card\n')) {

            let ccFields = e[4].split('\n');
            let [ccName, ccNumber, ccExpMonth, ccExpYear, ccCsc, notes] = ["", "", "", "", "", "", ""];
            for (let ccField of ccFields) {
              let [key, value] = ccField.split(':');
              if ((typeof (key) == 'string') && (typeof (value) == 'string')) {
                switch (key) {
                  case "Name on Card":
                    ccName = value;
                    break;
                  case "Number":
                    ccNumber = value;
                    break;
                  case "Security Code":
                    ccCsc = value;
                    break;
                  case "Expiration Date":
                    [ccExpMonth, ccExpYear] = value.split(',');
                    ccExpMonth = monthToNumber(ccExpMonth);
                    break;
                  case "Notes":
                    notes = value;
                }
              }
            }
            console.log(ccName, ccNumber, ccExpMonth, ccExpYear, ccCsc, notes);
            const pData = [
              path,
              "card",
              e[5],
              notes,
              ccNumber,
              ccName,
              ccExpMonth,
              ccExpYear,
              ccCsc,
            ];
            addRecord(safes, pData, { version: 5 });
          } else {
            addRecord(safes, [path, e[5], e[1], e[2], e[0], e[4]], options);
          }
        } else if (e[3].trim() === "") {
          addRecord(safes, [path, e[5], e[1], e[2], e[0], e[4]], options);
        } else {
          addRecord(safes, [path, e[5], e[1], e[2], e[0], e[4], e[3]], options);
        }
      }
    });
    return safes;
  }

  // url,username,password,extra,name,grouping,fav -- old lastpass
  if ((titles.length === 7)
    && (titles[0] === 'url')
    && (titles[1] === 'username')
    && (titles[2] === 'password')
    && (titles[3] === 'extra')
    && (titles[4] === 'name')
    && (titles[5] === 'grouping')
    && (titles[6] === 'fav')) {


    data.forEach((e) => {
      if (e.length === 7) {
        const extra1 = e[5].replaceAll('\\', '/');

        addRecord(safes, [extra1, e[4], e[1], e[2], e[0], e[3]]);
      }
    });
    return safes;
  }

  if ((titles.length === 4) // chrome
    && (titles[0] === 'name')
    && (titles[1] === 'url')
    && (titles[2] === 'username')
    && (titles[3] === 'password')) {
    // chrome
    data.forEach((e) => {
      if (e.length === 4) {
        const e1 = ['chrome', e[0], e[2], e[3], e[1], ''];
        addRecord(safes, e1);
      }
    });
    return safes;
  }


  if ((titles.length === 5) // chrome (at least 112)
    && (titles[0] === 'name')
    && (titles[1] === 'url')
    && (titles[2] === 'username')
    && (titles[3] === 'password')
    && (titles[4] === 'note')) {
    // chrome
    data.forEach((e) => {
      if (e.length === 5) {
        const e1 = ['chrome', e[0], e[2], e[3], e[1], e[4]];
        addRecord(safes, e1);
      }
    });
    return safes;
  }

  if ((titles.length === 6) // safari
    && (titles[0].toLowerCase() === 'title')
    && (titles[1].toLowerCase() === 'url')
    && (titles[2].toLowerCase() === 'username')
    && (titles[3].toLowerCase() === 'password')
    && (titles[4].toLowerCase() === 'notes')
    && (titles[5].toLowerCase() === 'otpauth')
  ) {
    // safari
    data.forEach((e) => {
      if (e.length === 6) {
        const e1 = ['safari', e[0], e[2], e[3], e[1], e[4]];
        addRecord(safes, e1);
      }
    });
    return safes;
  }


  if ((titles.length === 9) // firefox
    && (titles[0] === 'url')
    && (titles[1] === 'username')
    && (titles[2] === 'password')
    && (titles[3] === 'httpRealm')
    && (titles[4] === 'formActionOrigin')
    && (titles[5] === 'guid')
    && (titles[6] === 'timeCreated')
    && (titles[7] === 'timeLastUsed')
    && (titles[8] === 'timePasswordChanged')
  ) {
    // firefox
    data.forEach((e) => {
      if (e.length === 9) {
        const url = new URL(e[0]);
        const hostname = url.hostname;
        const e1 = ['firefox', hostname, e[1], e[2], e[0], ''];
        addRecord(safes, e1);
      }
    });
    return safes;
  }

  if (titles.length !== 6) {
    return 'Unknown file format';
    //    throw new Error('Unknown file format');
  }
  // KeePassX
  data.forEach((e) => {
    if (e.length === 6) {
      addRecord(safes, e);
    }
  });
  return safes;
}

export default importCSV;
