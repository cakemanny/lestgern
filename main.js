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
  if ("áíåóÁÍÅÓæ".indexOf(c) != -1) {
    return true;
  }
  return false;
}

Vue.component("keyboard-events", {
  created: function() {
    const component = this;
    this.handler = function(e) {
      if (event.target.localName === "body") {
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

Vue.component("entry-editor", {
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

      const computeLink = d => ({
        name: d.name,
        url: d.url(this.word)
      });

      return [].map.call(dictionaries, computeLink);
    }
  },
  watch: {
    word: function(value) {
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

    blurHint(event) {
      if (event.key === "Enter") {
        this.$emit("save-hint", this.hint);
      } else if (event.key === "Escape") {
        this.load();
      } else {
        // TODO?
      }
      event.target.blur();
      event.preventDefault();
    },

    addTag() {
      this.$emit("add-tag", this.newTag);
      this.newTag = "";
    }
  },
  // TODO: consider changing to v-model.lazy="hint"
  template: `
    <div>
      <h3>{{ word }}</h3>
      <input type="text" id="hint" class="hint" placeholder="hint"
        v-model="hint" v-on:keydown.esc="blurHint"
        v-on:keydown.enter="blurHint" />
      <ul>
        <li v-for="tag in tags">
          {{ tag }}
          <button v-on:click="$emit('delete-tag', tag)">x</button>
        </li>
        <li>
          <input type="text" placeholder="new tag" v-model="newTag"/>
          <button v-on:click="addTag">Add</button>
        </li>
      </ul>
      <div>
        <button v-for="i in [0,1,2,3,4]"
                class="fam"
                v-bind:class="{'sel': familiarity==i}"
                v-on:click="$emit('set-familiarity', i)"
                >{{ i }}</button>
      </div>
      <template v-for="dictLink in dictionaryLinks">
        <p>
          <a target="_" v-bind:href="dictLink.url">
            {{dictLink.name}}: {{word}}
          </a>
        </p>
      </template>
    </div>
  `
});

var app = new Vue({
  el: "#app",
  data: {
    selectedLanguage: "de",

    content: "",

    selectedLexemeIdx: -1,

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
        caseSensitive: true,
        dictionaries: [
          {
            name: "EN Wiktionary",
            url: word => `https://en.wiktionary.org/wiki/${word}#German`
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
            url: word => `https://www.deepl.com/en/translator#de/en/${word}`
          }
        ]
      },
      nl: {
        caseSensitive: false,
        dictionaries: [
          {
            name: "DeepL",
            url: word => `https://www.deepl.com/en/translator#nl/en/${word}`
          }
        ]
      }
    }
  },
  created: function() {
    let storedLang = localStorage.lestgern_lang;
    if (storedLang && storedLang in this.languages) {
      this.selectedLanguage = storedLang;
    }
    this.loadWordBank();
    this.loadContent();
  },
  computed: {
    /* Number  */
    wordCount() {
      return Object.keys(this.wordBank).length;
    },

    countWordsInText() {
      let uniqueWords = new Set();
      let knownWords = new Set();
      let lexemes = this.lexemes;

      let countNumWords = 0;
      let countKnownWords = 0;

      for (let lexeme of lexemes) {
        if (this.isWord(lexeme) && !this.isIgnored(lexeme)) {
          countNumWords += 1;
          uniqueWords.add(lexeme.word);
          if (this.isKnown(lexeme)) {
            countKnownWords += 1;
            knownWords.add(lexeme.word);
          }
        }
      }

      let percentage = 0;
      if (countNumWords > 0) {
        percentage = Math.round(100 * (countKnownWords / countNumWords));
      }

      return {
        unique: uniqueWords.size,
        unknown: uniqueWords.size - knownWords.size,
        percentage: percentage
      };
    },

    lexemes() {
      // This content has changed, so the selected index may no longer refer to
      // the same word
      this.selectedLexemeIdx = -1;

      const content = this.content;

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

      const theLexemes = theWords.map(word => {
        // want "word", "punctuation", "space"... I think
        const c0 = word.charAt(0);
        if (isAlpha(c0)) {
          return { kind: "word", word: word };
        } else if (c0 == "\n") {
          return { kind: "newline" };
        } else {
          return { kind: "punc", word: word };
        }
      });

      // Clearly the content hasn't broken our program... save!
      this.saveContent();

      return theLexemes;
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
      return (
        this.ignoredWords.hasOwnProperty(lexeme.word) &&
        this.ignoredWords[lexeme.word]
      );
    },
    isKnown(lexeme) {
      return this.wordBank.hasOwnProperty(lexeme.word);
    },
    familiarity(word) {
      if (this.wordBank.hasOwnProperty(word)) {
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

    handleKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        // These are not for us.
        return;
      }

      // TODO: Add some more of these:
      // https://www.lingq.com/en/forum/open-forum/a-guide-to-keyboard-shortcuts/

      if (event.key === "ArrowLeft") {
        return this.selectLeft(event);
      }
      if (event.key === "ArrowRight") {
        return this.selectRight(event);
      }
      if (event.key === "h") {
        return this.focusHint(event);
      }
      if (event.key === "b") {
        return this.selectNextNewWord(event);
      }
      if (event.key === "x") {
        return this.ignoreWord(event);
      }
      if (event.key === "X") {
        return this.unIgnoreWord(event);
      }
      if ("01234".indexOf(event.key) !== -1) {
        // Seems a bit heavyweight but ...
        let value = JSON.parse(event.key);
        this.setFamiliarity(this.selectedWord, value);
        event.preventDefault();
        return;
      }
    },

    focusHint(event) {
      // TODO: consider using refs:
      // https://vuejs.org/v2/guide/components-edge-cases.html#Accessing-Child-Component-Instances-amp-Child-Elements
      let hintElem = document.getElementById("hint");
      if (hintElem) {
        hintElem.focus();
        event.stopPropagation();
        /* stop the h being inputted */
        event.preventDefault();
      }
    },

    selectLeft(event) {
      if (this.selectedLexemeIdx > 0) {
        let idx = this.selectedLexemeIdx;
        let lexemes = this.lexemes;
        while (idx >= 0) {
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
      if (idx < len - 1) {
        while (idx < len) {
          idx += 1;
          if (this.isWord(lexemes[idx])) {
            this.selectWord(idx);
            event.stopPropagation();
            event.preventDefault();
            return;
          }
        }
      }
    },

    selectNextNewWord(event) {
      let lexemes = this.lexemes;
      let idx = this.selectedLexemeIdx;
      let len = lexemes.length;
      if (idx < len - 1) {
        while (idx < len) {
          idx += 1;
          if (this.isNew(lexemes[idx])) {
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
        // TODO: Maybe this should rebuild the wordBank each time?
        Vue.set(wordBank, word, {
          hint: "",
          tags: [],
          familiarity: 0
        });
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

    ignoreWord() {
      if (this.selectedWord) {
        Vue.set(this.ignoredWords, this.selectedWord, true);
        event.stopPropagation();
        event.preventDefault();
      }
    },

    unIgnoreWord(event) {
      if (this.selectedWord) {
        // trigger change for Vue
        Vue.set(this.ignoredWords, this.selectedWord, false);
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
