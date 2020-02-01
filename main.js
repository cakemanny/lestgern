function isAlpha(c) {
  if (c >= "a" && c <= "z") return true;
  if (c >= "A" && c <= "Z") return true;
  if ("üäöÜÄÖß".indexOf(c) != -1) {
    return true;
  }
  // Maybe add some french ones in, if we need to
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
    wordCount() {
      return Object.keys(this.wordBank).length;
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
      const PUNC = 1;

      var theWords = [];
      var currentWord = "";
      var state = 0;
      if (isAlpha(content.charAt(0))) {
        state = WORD;
      } else {
        state = PUNC;
      }
      for (let c of content) {
        if (state == WORD) {
          if (isAlpha(c)) {
            currentWord += c;
          } else {
            state = PUNC;
            theWords.push(currentWord);
            currentWord = c;
          }
        } else {
          if (isAlpha(c)) {
            state = WORD;
            theWords.push(currentWord);
            currentWord = c;
          } else {
            currentWord += c;
          }
        }
      }
      // add the final word
      theWords.push(currentWord);

      //var theWords = this.content.split(/\s/);
      var theLexemes = theWords.map(word => {
        // want "word", "punctuation", "space"... I think
        if (isAlpha(word.charAt(0))) {
          return { kind: "word", word: word };
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
        wordEntry.tags.push(this.newTag);
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
