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

var app = new Vue({
  el: "#app",
  data: {
    content: "",

    selectedWord: "wird",
    selectedWordHint: "becomes",
    newTag: "",

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
      return bankEntry.tags || [];
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
      return theLexemes;
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
        return this.wordBank[word].familiarity || 0;
      }
      return null;
    },
    isNew(lexeme) {
      return !this.isKnown(lexeme) && !this.isIgnored(lexeme);
    },

    saveWordBank() {
      localStorage.lingc = JSON.stringify(this.wordBank);
    },

    selectWord(word) {
      if (this.selectedWord && this.selectedWordHint) {
        // save old word
        let wordEntry = this._getOrAdd(this.wordBank, this.selectedWord);
        wordEntry.hint = this.selectedWordHint;
        this.saveWordBank();
      }
      this.selectedWord = word;
      this.selectedWordHint = "";
      if (this.wordBank[word]) {
        this.selectedWordHint = this.wordBank[word].hint;
      }

      this.newTag = "";
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

    setFamiliarity(number) {
      if (this.selectedWord) {
        let wordEntry = this._getOrAdd(this.wordBank, this.selectedWord);
        wordEntry.familiarity = number;
        this.saveWordBank();
      }
    }
  }
});
