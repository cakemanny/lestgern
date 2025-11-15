import assert from 'node:assert/strict';

import { describe, test } from 'node:test';

import { parse } from './main.js';

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
});
