"use strict";

import { createApp } from 'vue';

const DROPBOX_CLIENT_ID = 'cov7r6oc1yyd5ra';

function isAlpha(c) {
  if (c >= "a" && c <= "z") return true;
  if (c >= "A" && c <= "Z") return true;
  if ("üäöÜÄÖß".indexOf(c) != -1) {
    return true;
  }
  // Maybe add some french ones in, if we need to
  if ("çéâêîôûàèìòùëïü".indexOf(c) != -1) {
    return true;
  }
  // and ... czech? .... and whatever else
  if ("áíåóÁÍÅÓæñ".indexOf(c) != -1) {
    return true;
  }
  // polish :)
  if ("ćńśźżłóąęĆŃŚŹŻŁÓĄĘ".indexOf(c) != -1) {
    return true;
  }
  // See this for ranges
  // https://en.wikipedia.org/wiki/CJK_Unified_Ideographs
  // \u4E00 to \u9FFF
  const codePoint = c.codePointAt(0);
  if (codePoint >= 19968 && codePoint <= 40959) {
    return true
  }
  // Extension A
  // 3400 - 4DBF
  if (codePoint >= 13312 && codePoint <= 19903) {
    return true;
  }
  // TODO: ... the remaining ranges
  return false;
}

const parse = (content) => {

  if (!content) {
    return [];
  }

  const WORD = 0;
  const PUNC = 1; // incl space
  const NEWLINE = 2;

  let theWords = [];
  let currentWord = "";
  let state = 0;
  const c0 = content.charAt(0);
  if (isAlpha(c0)) {
    state = WORD;
  } else if (c0 === "\n" || c0 === "\r") {
    state = NEWLINE;
  } else {
    state = PUNC;
  }

  const switchTo = (newState, c) => {
    state = newState;
    currentWord = c;
  };
  for (let c of content) {
    if (c === "\r") {
      continue;
    }
    if (state == WORD) {
      if (isAlpha(c)) {
        currentWord += c;
      } else if (c == "\n") {
        theWords.push(currentWord);
        switchTo(NEWLINE, c);
      } else {
        theWords.push(currentWord);
        switchTo(PUNC, c);
      }
    } else if (state == NEWLINE) {
      theWords.push("\n");
      if (isAlpha(c)) {
        switchTo(WORD, c);
      } else if (c === "\n") {
        // pass
      } else {
        switchTo(PUNC, c);
      }
    } else {
      /* PUNC */
      if (isAlpha(c)) {
        theWords.push(currentWord);
        switchTo(WORD, c);
      } else if (c == "\n") {
        theWords.push(currentWord);
        switchTo(NEWLINE, c);
      } else {
        /* PUNC */
        currentWord += c;
      }
    }
  }
  // add the final word
  theWords.push(currentWord);

  const theLexemes = theWords.map((word, index) => {
    // want "word", "punctuation", "space"... I think
    const c0 = word.charAt(0);
    if (isAlpha(c0)) {
      return { kind: "word", word, index };
    } else if (c0 == "\n") {
      return { kind: "newline", index };
    } else {
      return { kind: "punc", word, index };
    }
  });

  return theLexemes;
};

const app = createApp({
  data: function () {return {
    selectedLanguage: "de",

    content: "",

    selectedLexemeIdx: -1,

    helpDisplayed: false,

    wordBank: {
      /* -- Example:
      wird: {
        hint: "becomes",
        tags: ["verb"],
        familiarity: 3
      }
      */
    },
    ignoredWords: {
      Robert: true
    },
    languages: {
      de: {
        bcp47code: "de-DE",
        caseSensitive: true,
        dictionaries: [
          {
            name: "EN Wiktionary",
            url: word => `https://en.wiktionary.org/wiki/${word}#German`
          },
          {
            name: "DE Wiktionary",
            url: word => `https://de.wiktionary.org/wiki/${word}#Deutsch`
          },
          {
            name: "Google Translate",
            url: word =>
              `https://translate.google.com/#view=home&op=translate&sl=de&tl=en&text=${word}`
          },
          {
            name: "Image Search",
            url: word => `https://www.google.com/search?q=${word}&tbm=isch`
          },
          {
            name: "DeepL",
            url: word => `https://www.deepl.com/en/translator#de/en/${word}`,
            isFavourite: true
          },
          {
            name: "dict.cc",
            url: word => `https://de-en.dict.cc/?s=${word}`
          },
          {
            name: "Forvo (pronunciation)",
            url: word => `https://forvo.com/search/${word}/de/`
          },
          {
            name: "DWDS",
            url: word => `https://dwds.de/?q=${word}`
          }
        ]
      },
      nl: {
        bcp47code: "nl-NL", // sorry nl-BE
        caseSensitive: false,
        dictionaries: [
          {
            name: "Glosbe",
            url: word => `https://en.glosbe.com/nl/en/${word}`,
            isFavourite: true
          },
          {
            name: "EN Wiktionary",
            url: word => `https://en.wiktionary.org/wiki/${word}#Dutch`
          },
          {
            name: "DeepL",
            url: word => `https://www.deepl.com/en/translator#nl/en/${word}`
          },
          {
            name: "Image Search",
            url: word => `https://www.google.com/search?q=${word}&tbm=isch`
          },
          {
            name: "Van Dale",
            url: word =>
              `https://www.vandale.nl/gratis-woordenboek/nederlands-engels/vertaling/${word}`
          },
          {
            name: "MWB",
            url: word =>
              `https://www.mijnwoordenboek.nl/vertalen.php?src=NL&des=EN&woord=${word}`
          },
          {
            name: "Forvo (pronunciation)",
            url: word => `https://forvo.com/search/${word}/nl/`
          }
        ]
      },
      pl: {
        bcp47code: "pl-PL",
        caseSensitive: false,
        dictionaries: [
          {
            name: "EN Wiktionary",
            url: word => `https://en.wiktionary.org/wiki/${word}#Polish`,
            isFavourite: true
          },
          {
            name: "EN Wiktionary (links)",
            url: word =>
              `https://en.wiktionary.org/wiki/Special:WhatLinksHere/${word}`
          },
          {
            name: "PL Wiktionary",
            url: word => `https://pl.wiktionary.org/wiki/${word}#Polish`
          },
          {
            name: "DeepL",
            url: word => `https://www.deepl.com/en/translator#pl/en/${word}`
          },
          {
            name: "Image Search",
            url: word => `https://www.google.com/search?q=${word}&tbm=isch`
          },
          {
            name: "Reverso Context ",
            url: word =>
              `https://context.reverso.net/translation/polish-english/${word}`
          },
          {
            name: "Forvo (pronunciation)",
            url: word => `https://forvo.com/search/${word}/pl/`
          },
          {
            name: "Edict.pl",
            url: word => `https://edict.pl/dict?word=${word}`
          },
          {
            name: "WSJP",
            url: word => `https://www.wsjp.pl/szukaj/podstawowe/wyniki?szukaj=${word}`
          },
          {
            name: "PWN",
            url: word => `https://sjp.pwn.pl/szukaj/${word}.html`
          }
        ]
      },
      yue: {
        bcp47code: "yue",
        caseSensitive: true,
        dictionaries: [
          {
            name: "EN Wiktionary",
            url: word => `https://en.wiktionary.org/wiki/${word}#Chinese`,
            isFavourite: true
          },
          {
            name: "EN Wiktionary (links)",
            url: word =>
              `https://en.wiktionary.org/wiki/Special:WhatLinksHere/${word}`
          },
          {
            name: "Canto Wikipedia",
            url: word => `https://zh-yue.wikipedia.org/wiki/${word}`
          },
          {
            name: "Google Translate",
            url: word =>
              `https://translate.google.com/?hl=en&sl=yue&tl=en&text=${word}&op=translate`
          },
          {
            name: "Image Search",
            url: word => `https://www.google.com/search?q=${word}&tbm=isch`
          },
          {
            name: "Canto Words",
            url: word => `https://cantowords.com/dictionary/wan/?q=${word}`
          },
          {
            name: "shyyp.net",
            url: word => `https://shyyp.net/hant/search?q=${word}`
          },
          {
            name: "jyut.net",
            url: word => `https://jyut.net/query?q=${word}`
          },
          {
            name: "words.hk",
            url: word => `https://words.hk/zidin/wan/?fp=1&q=${word}`
          },
          // https://www.moedict.tw/ could be useful?
        ]
      }
    },
    auth: {
      dropbox: {
        state: "none",
        tokenData: null,
      }
    },
    remoteSave: {
      dropbox: {
        state: "dirty",
      },
    },
  };},
  created: function() {
    let storedLang = localStorage.lestgern_lang;
    if (storedLang && storedLang in this.languages) {
      this.selectedLanguage = storedLang;
    }
    this.loadWordBank();
    this.loadContent();

    this.checkAndHandleOAuth2Code();
  },
  computed: {
    /* Number  */
    wordCount() {
      return Object.keys(this.wordBank).length;
    },

    countWordsInText() {
      const nonIgnoredWords = this.lexemes.filter(
        lexeme => this.isWord(lexeme) && !this.isIgnored(lexeme)
      );

      const countNumWords = nonIgnoredWords.length;
      const knownWords = nonIgnoredWords.filter(this.isKnown);

      const uniqueWords = new Set(nonIgnoredWords.map(l => l.word));
      const uniqueKnownWords = new Set(knownWords.map(l => l.word));

      const percentage =
        countNumWords > 0
          ? Math.round(100 * (knownWords.length / countNumWords))
          : 0;

      return {
        unique: uniqueWords.size,
        unknown: uniqueWords.size - uniqueKnownWords.size,
        percentage: percentage
      };
    },

    lexemes() {
      // This content has changed, so the selected index may no longer refer to
      // the same word
      this.selectedLexemeIdx = -1;

      const theLexemes = parse(this.content)

      // Clearly the content hasn't broken our program... save!
      this.saveContent();

      return theLexemes;
    },

    groupedLexemes() {
      function newRow() {
        return {
          // containsSelectedWord: false,
          lexemes: []
        };
      }

      let rows = [];
      let currentRow = newRow();
      for (let lexeme of this.lexemes) {
        currentRow.lexemes.push(
          Object.assign({}, lexeme, {
            // isSelected: false,
            isNew: this.isNew(lexeme),
            familiarity:
              lexeme.word && this.familiarity(this.normalise(lexeme.word))
          })
        );

        if (this.isNewline(lexeme)) {
          rows.push(currentRow);
          currentRow = newRow();
        }
      }
      rows.push(currentRow);

      return rows;
    },

    groupedLexemesWithSelection() {
      return this.groupedLexemes.map(row => {
        const containsSelectedLexeme =
          row.lexemes.length > 0 &&
          row.lexemes[0].index <= this.selectedLexemeIdx &&
          this.selectedLexemeIdx <= row.lexemes[row.lexemes.length - 1].index;

        if (containsSelectedLexeme) {
          const newLexemes = row.lexemes.map(lexeme => {
            const isSelected = lexeme.index === this.selectedLexemeIdx;
            if (isSelected) {
              return Object.assign({}, lexeme, { isSelected: true });
            } else {
              return lexeme;
            }
          });
          return Object.assign({}, row, {
            containsSelectedWord: true,
            lexemes: newLexemes
          });
        } else {
          return row;
        }
      });
    },

    selectedWord() {
      const lexemes = this.lexemes;
      if (lexemes && lexemes.length) {
        const idx = this.selectedLexemeIdx;
        if (idx < 0 || idx >= lexemes.length) {
          return "";
        }

        const lexeme = lexemes[idx];
        if (this.isWord(lexeme)) {
          if (!this.languages[this.selectedLanguage].caseSensitive) {
            return lexeme.word.toLowerCase();
          }
          return lexeme.word;
        }
      }
      return "";
    }
  },
  methods: {
    isWord(lexeme) {
      return lexeme.kind === "word";
    },
    isPunc(lexeme) {
      return lexeme.kind === "punc";
    },
    isNewline(lexeme) {
      return lexeme.kind === "newline";
    },
    isIgnored(lexeme) {
      const word = this.normalise(lexeme.word);
      return this.ignoredWords[word] === true;
    },
    isKnown(lexeme) {
      const word = this.normalise(lexeme.word);
      return word in this.wordBank;
    },
    familiarity(word) {
      if (this.wordBank[word]) {
        let bankEntry = this.wordBank[word];
        if (typeof bankEntry.familiarity === "undefined") {
          bankEntry.familiarity = 0;
        }
        return bankEntry.familiarity;
      }
      return null;
    },
    isNew(lexeme) {
      return (
        this.isWord(lexeme) && !this.isKnown(lexeme) && !this.isIgnored(lexeme)
      );
    },
    normalise(word) {
      const lang = this.languages[this.selectedLanguage];
      if (lang.caseSensitive) {
        return word;
      }
      return word.toLowerCase();
    },

    /*
     * Get the full key for the data storage
     */
    storageKey(subkey) {
      if (!subkey) {
        throw Error("no subkey");
      }
      if (!this.selectedLanguage) {
        throw Error("No language selected");
      }
      return "lestgern_" + this.selectedLanguage + "_" + subkey;
    },

    loadWordBank() {
      let wordBankJSON = localStorage[this.storageKey("wordbank")];
      if (wordBankJSON) {
        this.wordBank = JSON.parse(wordBankJSON);
      } else {
        this.wordBank = {};
      }
    },

    saveWordBank() {
      localStorage[this.storageKey("wordbank")] = JSON.stringify(this.wordBank);

      this.remoteSave.dropbox.state = "dirty"
    },

    loadContent() {
      let savedContent = localStorage[this.storageKey("content")];
      if (savedContent) {
        this.content = savedContent;
      } else {
        this.content = "";
      }
    },

    saveContent() {
      if (
        this.content &&
        this.content !== localStorage[this.storageKey("content")]
      ) {
        localStorage[this.storageKey("content")] = this.content;
      }
    },

    selectLanguage(langCode) {
      if (langCode === this.selectedLanguage) {
        return;
      }
      this.selectedLexemeIdx = -1;

      this.selectedLanguage = langCode;
      localStorage.lestgern_lang = langCode;

      this.loadWordBank();
      this.loadContent();
    },

    selectWord(index) {
      let lexeme = this.lexemes[index];
      if (!lexeme || !this.isWord(lexeme)) {
        return;
      }
      this.selectedLexemeIdx = index;
    },

    handleLexemeClick(event) {
      // use one click handler that is not bound to the instance rather than
      // potentially a handler for each lexeme
      if (event && event.target && event.target.dataset["index"]) {
        const index = event.target.dataset["index"] | 0;
        this.selectWord(index);
      }
    },

    handleKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        // These are not for us.
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "h") {
        // Change to b to make like vim?
        return this.selectLeft(event);
      }
      if (event.key === "ArrowRight" || event.key === "l") {
        // Change to w to make like vim?
        return this.selectRight(event);
      }
      if (event.key === "H" || event.key === "g") {
        return this.focusHint(event);
      }
      if (event.key === "b") {
        // ? maybe change this to
        return this.selectNextNewWord(event);
      }
      if (event.key === "B") {
        // TODO: previous new word?
      }
      if (event.key === "y") {
        return this.selectNextYellowWord(event);
      }
      if (event.key === "Y") {
        // TODO: previous yellow word?
      }
      // TODO: some sort or jump to next & prev paragraph
      if (event.key === "x") {
        return this.ignoreWord(event);
      }
      if (event.key === "X") {
        return this.unIgnoreWord(event);
      }
      if (event.key === "t") {
        return this.focusTag(event);
      }
      if (event.key === "K" || event.key === "f") {
        // or K in vim mode?
        return this.openFavouriteDict(event);
      }
      if (event.key === "?") {
        this.showHelp();
      }
      if ("01234".indexOf(event.key) !== -1) {
        // Seems a bit heavyweight but ...
        let value = JSON.parse(event.key);
        this.setFamiliarity(this.selectedWord, value);
        event.preventDefault();
        return;
      }
    },

    showHelp() {
      this.helpDisplayed = true;
    },

    closeHelp() {
      this.helpDisplayed = false;
    },

    async loginAtDropbox() {
      event.stopPropagation();
      event.preventDefault();

      async function sha256_base64encoded(message) {
          // encode as UTF-8
          const msgBuffer = new TextEncoder("utf-8").encode(message);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return btoa(String.fromCharCode.apply(null,
            new Uint8Array(hashBuffer)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }

      // This needs to be between 43 and 128 characters
      // Two UUIDs seems sufficient. 36 x 2
      const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
      sessionStorage.lestgern_dbx_code_verifier = codeVerifier;

      const codeChallenge = await sha256_base64encoded(codeVerifier);

      const redirectURI = window.location.href;

      // TODO: should we add state ?

      const dropboxAuthURL = "https://www.dropbox.com/oauth2/authorize" +
        `?client_id=${DROPBOX_CLIENT_ID}` +
        "&response_type=code" +
        `&redirect_uri=${redirectURI}` +
        `&code_challenge=${codeChallenge}` +
        "&code_challenge_method=S256"

      window.location = dropboxAuthURL;
    },

    checkAndHandleOAuth2Code() {
      const oauth2Code = new URL(window.location.href).searchParams.get('code');
      if (oauth2Code) {
        this.handleOAuth2Code(oauth2Code)
      }
      // TODO: check for error and do something with it
      const oauth2error = new URL(window.location.href).searchParams.get('error');
      if (oauth2error) {
        this.auth.dropbox.state = "failed";
        let cleanedURL = new URL(window.location.href);
        cleanedURL.searchParams.delete('error');
        cleanedURL.searchParams.delete('error_summary');
        window.history.replaceState(null, null, cleanedURL);
      }

      if (sessionStorage.lestgern_dbx_oauth_access) {
        // TODO: check if token is valid
        this.auth.dropbox.tokenData = JSON.parse(
          sessionStorage.lestgern_dbx_oauth_access
        );
        this.auth.dropbox.state = 'success';
      }
    },

    handleOAuth2Code(oauth2Code) {
      function redactURL() {
        let codeRemovedURL = new URL(window.location.href);
        codeRemovedURL.searchParams.delete('code');
        window.history.replaceState(null, null, codeRemovedURL);
      }
      redactURL();

      const codeVerifier = sessionStorage.lestgern_dbx_code_verifier;
      if (!codeVerifier) {
        console.warn('no lestgern_dbx_code_verifier in sessionStorage');
        return;
      }

      // Dropbox's OAuth 2.0 endpoint for requesting an access token
      const oauth2Endpoint = 'https://api.dropbox.com/oauth2/token';

      // Parameters to pass to OAuth 2.0 endpoint.
      const params = new URLSearchParams({
        'code': oauth2Code,
        'grant_type': 'authorization_code',
        'redirect_uri': window.location.href,
        'code_verifier': codeVerifier,
        'client_id': DROPBOX_CLIENT_ID
      });

      this.auth.dropbox.state = 'pending';

      fetch(oauth2Endpoint, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: params // body data type must match "Content-Type" header
      }).then(r => {
        r.json().then(responseData => {
          if (!r.ok) {
            console.log(responseData.error_summary);
            this.onAuthFailedDropbox();
            return;
          }
          if (!responseData.access_token) {
            console.warn("token reponse missing access_token");
            return;
          }
          // Clean up PKCE challenge
          delete sessionStorage.lestgern_dbx_code_verifier;
          this.onAuthedDropbox(responseData);
        });
      });
    },

    onAuthedDropbox(tokenData) {
      sessionStorage.lestgern_dbx_oauth_access = JSON.stringify(tokenData);
      this.auth.dropbox.tokenData = tokenData;
      this.auth.dropbox.state = 'success';
    },

    onAuthFailedDropbox() {
      this.auth.dropbox.state = 'failed';
    },

    loadFromDropbox() {
      // TODO
    },
    saveToDropbox() {
      let dataToExport = {};
      for (let k in localStorage) {
        if (k.startsWith('lestgern_')) {
          dataToExport[k] = localStorage[k];
        }
      }
      let blob = new Blob([JSON.stringify(dataToExport)], {type:"octet/stream"});

      const accessToken = this.auth.dropbox.tokenData.access_token;

      this.remoteSave.dropbox.state = 'pending';

      // docs: https://www.dropbox.com/developers/documentation/http/documentation#files-upload
      fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin', // may need to be "include" ...
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            'autorename': false,
            'mode': 'overwrite',
            'mute': false,
            'path': '/lestgern-data.v0.json',
            'strict_conflict': false
          }),
          'Content-Type': 'application/octet-stream',
        },
        redirect: 'follow',
        body: blob,
      }).then(async r => {
        return r.json().then(responseData => {
          if (!r.ok) {
            console.log(responseData.error_summary);
            this.remoteSave.dropbox.state = "error";
            return;
          }
          this.remoteSave.dropbox.state = "saved";
          // TODO: do something with the revision or content hash?
        })
      }).catch(reason => {
        console.error("saving to dropbox failed:", reason)
        this.remoteSave.dropbox.state = "error";
      })
    },

    focusHint(event) {
      if (this.$refs.editor) {
        this.$refs.editor.focusHint();
        event.stopPropagation();
        /* stop the h being inputted */
        event.preventDefault();
      }
    },

    focusTag(event) {
      if (this.$refs.editor) {
        this.$refs.editor.focusTag();
        event.stopPropagation();
        event.preventDefault();
      }
    },

    openFavouriteDict(event) {
      if (!this.selectedWord) {
        return;
      }
      const lang = this.languages[this.selectedLanguage];
      const favDict = lang.dictionaries
        .filter(d => d.isFavourite)
        .concat(lang.dictionaries)[0];

      const url = favDict.url(this.selectedWord);
      window.open(url, "_");

      event.stopPropagation();
      event.preventDefault();
    },

    setFavouriteDict(idx) {
      const lang = this.languages[this.selectedLanguage];
      if (idx < 0 || idx >= lang.dictionaries.length) {
        return;
      }
      lang.dictionaries = lang.dictionaries.map((d, i) => {
        d.isFavourite = i === idx;
        return d;
      });
    },

    selectLeft(event) {
      if (this.selectedLexemeIdx > 0) {
        let idx = this.selectedLexemeIdx;
        let lexemes = this.lexemes;
        while (idx > 0) {
          idx -= 1;
          if (this.isWord(lexemes[idx])) {
            this.selectWord(idx);
            event.stopPropagation();
            event.preventDefault();
            return;
          }
        }
      }
    },

    selectRight(event) {
      let lexemes = this.lexemes;
      let idx = this.selectedLexemeIdx;
      let len = lexemes.length;
      while (idx < len - 1) {
        idx += 1;
        if (this.isWord(lexemes[idx])) {
          this.selectWord(idx);
          event.stopPropagation();
          event.preventDefault();
          return;
        }
      }
    },

    selectNextNewWord(event) {
      let lexemes = this.lexemes;
      let idx = this.selectedLexemeIdx;
      let len = lexemes.length;
      while (idx < len - 1) {
        idx += 1;
        if (this.isNew(lexemes[idx])) {
          this.selectWord(idx);
          event.stopPropagation();
          event.preventDefault();
          return;
        }
      }
    },

    selectNextYellowWord(event) {
      let lexemes = this.lexemes;
      let idx = this.selectedLexemeIdx;
      let len = lexemes.length;
      while (idx < len - 1) {
        idx += 1;
        if (this.isWord(lexemes[idx])) {
          const familiarity = this.familiarity(
            this.normalise(lexemes[idx].word)
          );
          if (familiarity !== null && familiarity < 4) {
            this.selectWord(idx);
            event.stopPropagation();
            event.preventDefault();
            return;
          }
        }
      }
    },

    _getOrAdd(wordBank, word) {
      if (!wordBank[word]) {
        wordBank[word] = {
          hint: "",
          tags: [],
          familiarity: 0
        };
      }
      return wordBank[word];
    },

    saveHint(word, hint) {
      if (word && hint) {
        let wordEntry = this._getOrAdd(this.wordBank, word);
        if (hint !== wordEntry.hint) {
          wordEntry.hint = hint;
          this.saveWordBank();
        }
      }
    },

    addTag(word, newTag) {
      if (word && newTag) {
        let wordEntry = this._getOrAdd(this.wordBank, word);

        if (!wordEntry.tags) {
          wordEntry.tags = [];
        }

        if (!wordEntry.tags.includes(newTag)) {
          wordEntry.tags.push(newTag);
        }
        this.saveWordBank();
      }
    },

    deleteTag(word, tag) {
      if (word) {
        let wordEntry = this._getOrAdd(this.wordBank, word);
        wordEntry.tags = wordEntry.tags.filter(t => t !== tag);
        this.saveWordBank();
      }
    },

    ignoreWord(event) {
      if (this.selectedWord) {
        this.ignoredWords[this.selectedWord] = true;
        event.stopPropagation();
        event.preventDefault();
      }
    },

    unIgnoreWord(event) {
      if (this.selectedWord) {
        this.ignoredWords[this.selectedWord] = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },

    setFamiliarity(word, number) {
      if (word) {
        let wordEntry = this._getOrAdd(this.wordBank, word);
        wordEntry.familiarity = number;
        this.saveWordBank();
      }
    }
  }
});

app.component("keyboard-events", {
  created: function() {
    const component = this;
    this.handler = function(e) {
      if (e.target.localName === "body") {
        component.$emit("keydown", e);
      }
    };
    window.addEventListener("keydown", this.handler);
  },
  beforeDestroy: function() {
    window.removeEventListener("keydown", this.handler);
  },
  template: `<div style="display:none"></div>`
});

app.component("sound-preview", {
  props: {
    text: String,
    lang: String
  },
  created: function() {
    if (window.speechSynthesis) {
      // FIXME: this will break if there is ever more than one of these at a
      // time
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
    }
  },
  data: function() {
    return {
      voices: window.speechSynthesis ? window.speechSynthesis.getVoices() : [],
      playing: false
    };
  },
  methods: {
    speak() {
      // Have found that the remote engine can never play and jam the whole
      // queue up.  If the user has clicked again, then we don't care about
      // previous requests completing
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = this.text;

      // There may be a better way to choose the appropriate language
      const voices = this.voicesForLang();
      const remoteDefault = voices.filter(v => v.default && !v.localService)[0];
      const remote = voices.filter(v => !v.default && !v.localService)[0];
      const localDefault = voices.filter(v => v.default && v.localService)[0];
      const localOther = voices.filter(v => !v.default && v.localService)[0];
      utterance.voice = remoteDefault || remote || localDefault || localOther;

      utterance.onstart = () => {
        this.playing = true;
      };
      utterance.onend = () => {
        this.playing = false;
      };
      utterance.onerror = () => {
        this.playing = false;
      };

      window.speechSynthesis.speak(utterance);
    },

    voicesForLang() {
      // This obviously doesn't work in general. But might be ok what languages
      // we are supporting...
      return this.voices.filter(v => v.lang.startsWith(this.lang));
    }
  },
  computed: {
    hasSpeechSynthesis() {
      if (this.voicesForLang().length > 0) {
        return true;
      }
      return false;
    }
  },
  template: `
    <span v-if="hasSpeechSynthesis" class="sound-preview">
      <span v-if="playing">🔊</span>
      <span v-else v-on:click="speak">🔈</span>
    </span>
  `
});

app.component("entry-editor", {
  props: {
    word: {
      type: String,
      validator: value => !!value
    },
    wordBank: Object,
    familiarity: Number,
    language: Object
  },
  data: function() {
    return {
      hint: "",
      newTag: ""
    };
  },
  created: function() {
    this.load();
  },
  computed: {
    tags() {
      let bankEntry = this.wordBank[this.word];
      if (!bankEntry) {
        // This is why our add method doesn't seem to work
        return [];
      }
      if (!bankEntry.tags) {
        bankEntry.tags = [];
      }
      return bankEntry.tags;
    },

    dictionaryLinks() {
      const dictionaries = this.language.dictionaries;

      const computeLink = (d, idx) => ({
        name: d.name,
        url: d.url(this.word),
        isFavourite: !!d.isFavourite,
        idx
      });

      return [].map.call(dictionaries, computeLink);
    }
  },
  watch: {
    word: function() {
      // change the hint when the selected word changes
      this.load();
    }
  },
  methods: {
    load() {
      if (this.wordBank[this.word]) {
        this.hint = this.wordBank[this.word].hint;
      } else {
        this.hint = "";
      }
      this.newTag = "";
    },

    focusHint() {
      this.$refs.hintInput.focus();
    },

    blurHint(event) {
      if (event.key === "Enter") {
        this.$emit("save-hint", this.hint);
      } else if (event.key === "Escape") {
        this.load();
      }
      event.target.blur();
      event.preventDefault();
    },

    handleBlur() {
      this.$emit("save-hint", this.hint);
    },

    focusTag() {
      this.$refs.newTagInput.focus();
    },

    addTag(event) {
      this.$emit("add-tag", this.newTag);
      this.newTag = "";
      // This could be annoying but reaching for ESC after entering a tag
      // is more painful. Hitting t for each tag isn't too hard.
      event.target.blur();
    }
  },
  template: `
    <div>
      <h3>
        {{ word }}
        <sound-preview v-bind:text="word" v-bind:lang="language.bcp47code"/>
      </h3>
      <input type="text"
        id="hint"
        ref="hintInput"
        class="entry-editor__hint"
        placeholder="hint"
        v-model="hint"
        v-on:keydown.esc="blurHint"
        v-on:keydown.enter="blurHint"
        v-on:blur="handleBlur" />
      <ul>
        <li v-for="tag in tags">
          {{ tag }}
          <button v-on:click="$emit('delete-tag', tag)">✖</button>
        </li>
        <li>
          <div class="entry-editor__new-tag-container">
            <input type="text"
              placeholder="new tag"
              class="entry-editor__new-tag-input"
              v-model="newTag"
              v-on:keydown.enter.prevent="addTag"
              v-on:keydown.esc.prevent="$event.target.blur()"
              ref="newTagInput"
            />
            <button v-on:click="addTag">Add</button>
          </div>
        </li>
      </ul>
      <div>
        <!-- TODO: add spacing for mobile!! -->
        <button
          v-for="i in [0,1,2,3,4]"
          class="entry-editor__familiarity"
          v-bind:class="{'entry-editor__familiarity--selected': familiarity==i}"
          v-on:click="$emit('set-familiarity', i)"
          >{{ i }}</button>
      </div>
      <template v-for="dictLink in dictionaryLinks">
        <p>
          <a target="_" v-bind:href="dictLink.url">
            {{ dictLink.name }}: {{ word }}
          </a>
          <!-- TODO: make these buttons -->
          <span
            class="entry-editor__fav"
            v-if="dictLink.isFavourite"
            >♥</span>
          <span
            class="entry-editor__fav"
            v-else
            v-on:click="$emit('set-favourite-dict', dictLink.idx)"
            >♡</span>
        </p>
      </template>
    </div>
  `
});

app.component("lexeme-row", {
  props: {
    isWord: Function,
    isPunc: Function,
    isNewline: Function,
    familiarity: Number,
    isNew: Boolean,
    row: Object
  },
  methods: {
    wordClasses(lexeme) {
      let result = [];
      if (lexeme.isNew) {
        result.push("new-word");
      } else if (typeof lexeme.familiarity === "number") {
        result.push("known-word-" + lexeme.familiarity);
      }
      if (lexeme.isSelected) {
        result.push("selected-word");
      }
      return result;
    }
  },
  // This is formatted oddly so that we don't end up with whitespace between
  // the spans
  template: `
    <div>
      <template v-for="lexeme in row.lexemes">
        <span
          v-if="isWord(lexeme)"
          class="word"
          v-bind:class="wordClasses(lexeme)"
          v-bind:data-index="lexeme.index"
        >{{ lexeme.word }}</span><span
          v-else-if="isPunc(lexeme)"
        >{{ lexeme.word }}</span><br
          v-else-if="isNewline"/>
      </template>
    </div>
  `
});

app.component("help-view", {
  data: function() {
    return {
      keyHelp: [
        ["←,h", "Select the previous word"],
        ["→,l", "Select the next word"],
        ["b", "Select next blue word"],
        ["y", "Select next yellow word"],
        ["x", "Ignore selected word"],
        ["X", "Unignore selected word"],
        ["H,g", "Focus on the hint box"],
        ["K,f", "Open favourite dictionary"],
        ["enter", "Save the hint / add the tag"],
        ["esc", "Cancel editing the hint / tag"],
        ["0,1,2,3,4", "Set word familiarity"],
        ["t", "Focus on the tag box"],
        ["?", "Show this help"]
      ]
    };
  },
  methods: {
    handleBackgroundClick(event) {
      if (event.target.className === "help-view") {
        this.$emit("close-help");
        event.stopPropagation();
      }
    }
  },
  template: `
    <div class="help-view" v-on:click="handleBackgroundClick">
      <div class="help-view__container">
        <button
          class="help-view__close"
          type="button"
          alt="close"
          v-on:click="$emit('close-help')"
          >✖</button>
        <h2>Help</h2>
        <h3>Getting Started</h3>
        <ol>
          <li>Paste an article or page from a book into the content box</li>
          <li>Read a sentence</li>
          <li>Select a word you are unfamiliar with</li>
          <li>Use the lookup links to try to understand the word</li>
          <li>Write down a hint in the hint box</li>
          <li>Repeat until you understand the sentence</li>
          <li>Mark any known words as level 4 familiarity</li>
          <li>Repeat until you understand the article/page</li>
          <li>
            As you continue to use the app, when you see a word in yellow,
            you will know that you have come across the word before.
            Selecting the word will show the hint.
            Increase the word's familiarity as it starts to become more
            familiar.
          </li>
        </ol>
        <h3>Keyboard Shortcuts</h3>
        <table>
          <tr v-for="keyRow in keyHelp">
            <td><kbd>{{ keyRow[0] }}</kbd></td>
            <td>{{ keyRow[1] }}</td>
          </tr>
        </table>
      </div>
    </div>
  `
});

app.component("dropbox-saver", {
  props: {
    state: String, // dirty | saved | error | pending
  },
  data: function() {
    return {};
  },
  methods: {
    handleSave(_event) {
      this.$emit("save-data");
    }
  },
  computed: {
    saveIcon() {
      switch (this.state) {
        case 'dirty': return '☁️'; // Cloud
        case 'saved': return '🌤️'; // Sun behind cloud
        case 'pending': return '✈️'; // Plane
        case 'error': return '⛈️'; // Storm clouds
      }
      throw Error(`bad dropbox-editor state: ${this.state}`);
    }
  },
  template: `
    <span>
      <button
        v-on:click="handleSave"
        v-bind:disabled="state === 'saved' || state === 'pending'"
        >Save {{saveIcon}}</button>
      <span v-if="state === 'error'"
        > 😰 </span>
      <button title="not yet implemented" disabled>Load 🛬</button>
    </span>
  `
});

export { app, parse };
