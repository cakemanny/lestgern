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

var app = new Vue({
  el: "#app",
  data: {
    content: "",

    hint: "",
    newTag: "",

    selectedLexemeIdx: 0,

    // TODO: app lifecycle -> onload -> load from some storage
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
    }
  },
  created: function() {
    let wbJSON = localStorage.lingc;
    if (wbJSON) {
      this.wordBank = JSON.parse(wbJSON);
    }
    let savedContent = localStorage.lingc_0_content;
    if (savedContent) {
      this.content = savedContent;
    }

    // TODO: move to sub-component
    this.loadHint();
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
      for (let lexeme of lexemes) {
        if (lexeme.kind === "word") {
          uniqueWords.add(lexeme.word);
          if (this.isKnown(lexeme)) {
            knownWords.add(lexeme.word);
          }
        }
      }
      return {
        unique: uniqueWords.size,
        unknown: uniqueWords.size - knownWords.size
      };
    },

    tags() {
      let bankEntry = this.wordBank[this.selectedWord];
      if (!bankEntry) {
        return [];
      }
      if (!bankEntry.tags) {
        bankEntry.tags = [];
      }
      return bankEntry.tags;
    },

    lexemes() {
      let content = this.content;

      if (!content) {
        return [];
      }

      const WORD = 0;
      const PUNC = 1; // incl space
      const NEWLINE = 2;

      let theWords = [];
      let currentWord = "";
      let state = 0;
      let c0 = content.charAt(0);
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

      //let theWords = this.content.split(/\s/);
      let theLexemes = theWords.map(word => {
        // want "word", "punctuation", "space"... I think
        let c0 = word.charAt(0);
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
      if (this.lexemes && this.lexemes.length) {
        if (this.selectedLexemeIdx >= this.lexemes.length) {
          return "";
        }

        let lexeme = this.lexemes[this.selectedLexemeIdx];
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
      return this.ignoredWords.hasOwnProperty(lexeme.word);
    },
    isKnown(lexeme) {
      return this.wordBank.hasOwnProperty(lexeme.word);
    },
    familiarity(word) {
      if (this.wordBank.hasOwnProperty(word)) {
        let bankEntry = this.wordBank[word];
        if (typeof bankEntry.familiarity === "undefined") {
          bankEntry.familiary = 0;
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

    saveWordBank() {
      localStorage.lingc = JSON.stringify(this.wordBank);
    },

    saveContent() {
      if (this.content && this.content !== localStorage.lingc_0_content) {
        localStorage.lingc_0_content = this.content;
      }
    },

    selectWord(index) {
      let lexeme = this.lexemes[index];
      if (!lexeme || !this.isWord(lexeme)) {
        return;
      }
      if (this.selectedWord && this.hint) {
        // save old word
        let wordEntry = this._getOrAdd(this.wordBank, this.selectedWord);
        wordEntry.hint = this.hint;
        this.saveWordBank();
      }

      this.selectedLexemeIdx = index;
      this.loadHint();
      this.newTag = "";
    },

    handleKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        // These are not for us.
        return;
      }

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
      if ("01234".indexOf(event.key) !== -1) {
        // Seems a bit heavyweight but ...
        let value = JSON.parse(event.key);
        this.setFamiliarity(value);
        event.preventDefault();
        return;
      }
    },

    focusHint(event) {
      let hintElem = document.getElementById("hint");
      if (hintElem) {
        hintElem.focus();
        event.stopPropagation();
        /* stop the h being inputted */
        event.preventDefault();
      }
    },

    blurHint(event) {
      event.target.blur();
      event.preventDefault();
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

    loadHint() {
      if (this.selectedWord) {
        let word = this.selectedWord;
        if (this.wordBank[word]) {
          this.hint = this.wordBank[word].hint;
          return;
        }
      }
      this.hint = "";
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

    addTag() {
      if (this.selectedWord && this.newTag) {
        let wordEntry = this._getOrAdd(this.wordBank, this.selectedWord);

        if (!wordEntry.tags.includes(this.newTag)) {
          // concat so Vue can track the update
          wordEntry.tags = wordEntry.tags.concat(this.newTag);
        }
        // temp code to remove dups
        let rebuilt = {};
        for (let x of wordEntry.tags) {
          rebuilt[x] = 1;
        }
        wordEntry.tags = Object.keys(rebuilt);
        //
        this.saveWordBank();
      }
    },

    deleteTag(tag) {
      if (this.selectedWord) {
        let wordEntry = this._getOrAdd(this.wordBank, this.selectedWord);
        wordEntry.tags = wordEntry.tags.filter(t => t !== tag);
        this.saveWordBank();
      }
    },

    setFamiliarity(number) {
      if (this.selectedWord) {
        let wordEntry = this._getOrAdd(this.wordBank, this.selectedWord);
        wordEntry.familiarity = number;
        this.saveWordBank();
      }
    }
  }
});
