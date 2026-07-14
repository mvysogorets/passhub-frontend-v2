const mockData = {
  goPremium: false,
  takeSurvey: true,
  plan: "FREE-26",
  /*  theme: "theme-dark", */
  safes: [
    {
      name: "Mock Safe",
      id: 1,
      key: 1,
      items: [],
      folders: [
        {
          SafeID: 1,
          id: "f1",
          _id: "f1",
          name: "Mock Folder",
          cleartext: ["Mock Folder"],
          parent: 0,
          folders: [],
          lastModified: "2021-08-27T02:01:20+00:00",
          items: [
            {
              SafeID: 1,
              folder: "f1",
              _id: "f1i1",
              cleartext: [
                "Gmail",
                "alice",
                "kjhgqw",
                "https://gmail.com",
                "Work mail",
              ],
              lastModified: "2021-08-27T02:01:20+00:00",
            },
            {
              SafeID: 1,
              folder: "f1",
              _id: "f1i2",
              cleartext: [
                "Note",
                "alice",
                "",
                "",
                "Work mail\r\n kj skajhdah skdal fklasjh ljkah lkjdsh kljdh afljksdh fkljas hfjkdsh afjkah ldh",
              ],
              note: 1,
              lastModified: "2021-08-27T02:01:20+00:00",
            },

          ],
        },
      ],
    },

    //-------------------------------
    {
      name: "Private",
      id: "sp52",
      key: 1,
      items: [
        {
          SafeID: 2,
          folder: 0,
          _id: "2i1",
          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i2",
          cleartext: [
            "long username",
            "alicealicealicealicealicealicealicealicealicealicealicealicealicealicealicealicealice",
            "",
            "",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i3",
          cleartext: [
            "long password",
            "",
            "kjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwk",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i4",

          cleartext: [
            "long url",
            "alice",
            "kjhgqw",
            "https://longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonggmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i5",

          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i6",
          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i7",
          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i8",
          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2i9",
          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 2,
          folder: 0,
          _id: "2ia",
          cleartext: [
            "Gmail",
            "alice",
            "kjhgqw",
            "https://gmail.com",
            "Work mail",
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
      ],
      // folders: []
      ///////////////////////////////

      folders: [
        {
          SafeID: 2,
          id: "f21",
          _id: "_f21",
          name: "SubFolder",
          cleartext: ["SubFolder"],
          parent: 0,
          folders: [],
          items: [],
        },
        /*
        {
          SafeID: 2,
          id: "f22",
          name: "SubFolder2",
          cleartext: ["SubFolder2"],
          parent: 0,
          folders: [],
          items: [],
        },
        */

        {
          SafeID: 2,
          FolderID: "f23",
          id: "f23",
          _id: "_f23",
          name: "SubFolder3",
          cleartext: ["SubFolder3"],
          parent: 0,
          folders: [
            {
              SafeID: 2,
              id: "f231",
              name: "SubFolder31",
              cleartext: ["SubFolder31"],
              parent: "f23",
              folders: [],
              items: [],
            }

          ],
          items: [],
        },
      ],

    },
    //------------------------------------------





    { name: "Work", id: 3, items: [], folders: [] },
    { name: "x1", id: 4, items: [], folders: [] },
    { name: "x2", id: 5, items: [], folders: [] },
    { name: "x3", id: 6, items: [], folders: [] },
    { name: "x4", id: 7, items: [], folders: [] },
    { name: "x5", id: 8, items: [], folders: [] },
    { name: "x6", id: 9, items: [], folders: [] },
    { name: "x7", id: 10, items: [], folders: [] },
    {
      name: "x8", id: 11, items: [
        {
          SafeID: 11,
          folder: 0,
          _id: "11",
          cleartext: [
            "long password",
            "shortname but",
            "kjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwkjhgqwk",
            "https://gmail.com",
            "Work mail",
            "22334455"
          ],
          lastModified: "2021-08-27T02:01:20+00:00",
        },
        {
          SafeID: 11,
          folder: 0,
          _id: "12",
          cleartext: [
            "The note",
            "",
            "",
            "",
            "Work mail",
          ],
          note: 1,
          lastModified: "2021-08-27T02:01:20+00:00",
        },

      ], folders: []
    },
    {
      name: "Cards",
      id: 12,
      key: 1,
      items: [
        {
          SafeID: 12,
          folder: 0,
          _id: "12i1",

          cleartext: [
            "card",
            "Card1",
            "first card",
            "3700 000000 00000",
            "Mike",
            "03",
            "2024",
            "777",
          ],
          version: 5,
          lastModified: "2021-08-27T02:01:20+00:00",
        },
      ],
      folders: [],
    },
  ],
};

export default mockData;