import assert from 'node:assert/strict';

import { describe, test, it } from 'node:test';

import { parse, markPhrases } from './main.js';

describe('parse', () => {
  test('de1', () => {
    const lexemes = parse('der Mann  im Garten\nist braun');
    assert.deepEqual(lexemes, [
      { kind: 'word', word: 'der', index: 0 },
      { kind: 'punc', word: ' ', index: 1 },
      { kind: 'word', word: 'Mann', index: 2 },
      { kind: 'punc', word: '  ', index: 3 },
      { kind: 'word', word: 'im', index: 4 },
      { kind: 'punc', word: ' ', index: 5 },
      { kind: 'word', word: 'Garten', index: 6 },
      { kind: 'newline', index: 7 },
      { kind: 'word', word: 'ist', index: 8 },
      { kind: 'punc', word: ' ', index: 9 },
      { kind: 'word', word: 'braun', index: 10 },
    ]);
  });

  test('粵話', () => {
    const lexemes = parse('我係Peppa');
    assert.deepEqual(lexemes, [
      { kind: 'word', word: '我', index: 0 },
      { kind: 'word', word: '係', index: 1 },
      { kind: 'word', word: 'Peppa', index: 2 },
    ]);
  });
});

describe('markPhrases', () => {
  it('marks number of phrases starting and ending at each lexeme', () => {
    const wordBank = {
      "鍾意": {
        hint: "like",
        tags: [],
        familiarity: 0,
      },
      "我": {
        hint: "I",
        tags: [],
        familiarity: 2,
      },
      "我哋": {
        hint: "we",
        tags: [],
        familiarity: 2,
      },
    };

    const lexemes = parse('我鍾意食衫同埋褲');

    const markedLexemes = markPhrases(wordBank, lexemes);

    assert.deepEqual(markedLexemes, [
      {
        index: 0,
        kind: 'word',
        word: '我',
        phrasesStarted: 0,
        phrasesEnded: 0,
      },
      {
        index: 1,
        kind: 'word',
        word: '鍾',
        phrasesStarted: 1,
        phrasesEnded: 0,
      },
      {
        index: 2,
        kind: 'word',
        word: '意',
        phrasesStarted: 0,
        phrasesEnded: 1,
      },
      {
        index: 3,
        kind: 'word',
        word: '食',
        phrasesStarted: 0,
        phrasesEnded: 0,
      },
      {
        index: 4,
        kind: 'word',
        word: '衫',
        phrasesStarted: 0,
        phrasesEnded: 0,
      },
      {
        index: 5,
        kind: 'word',
        word: '同',
        phrasesStarted: 0,
        phrasesEnded: 0,
      },
      {
        index: 6,
        kind: 'word',
        word: '埋',
        phrasesStarted: 0,
        phrasesEnded: 0,
      },
      {
        index: 7,
        kind: 'word',
        word: '褲',
        phrasesStarted: 0,
        phrasesEnded: 0,
      }
    ]);

  });

});
