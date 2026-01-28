import { describe, it, expect } from 'vitest';
import {
  WORD_LIST,
  CLASSIC_WORDS,
  KAHOOT_WORDS,
  GEOGRAPHY_WORDS,
  POP_CULTURE_WORDS,
  SCIENCE_WORDS,
  SPACE_WORDS,
  NATURE_WORDS,
  generateBoard,
  assignTeams,
  getWordList,
  getCombinedWordList,
  getPackDisplayName,
  getPackSelectionDisplayName,
  getAvailablePacks,
  getWordCount,
  WordPack
} from '../words';

// ============================================================================
// Word Lists
// ============================================================================

describe('WORD_LIST (backward compatibility)', () => {
  it('is an alias for CLASSIC_WORDS', () => {
    expect(WORD_LIST).toBe(CLASSIC_WORDS);
  });
});

// Helper to test common word list properties
function testWordList(name: string, words: string[], minWords = 25) {
  describe(name, () => {
    it(`has at least ${minWords} words for a board`, () => {
      expect(words.length).toBeGreaterThanOrEqual(minWords);
    });

    it('contains unique words', () => {
      const uniqueWords = new Set(words);
      expect(uniqueWords.size).toBe(words.length);
    });

    it('words are uppercase', () => {
      words.forEach((word) => {
        expect(word).toBe(word.toUpperCase());
      });
    });

    it('words are non-empty strings', () => {
      words.forEach((word) => {
        expect(typeof word).toBe('string');
        expect(word.length).toBeGreaterThan(0);
      });
    });
  });
}

// Test all word packs
testWordList('CLASSIC_WORDS', CLASSIC_WORDS, 200);
testWordList('KAHOOT_WORDS', KAHOOT_WORDS, 25);
testWordList('GEOGRAPHY_WORDS', GEOGRAPHY_WORDS, 150);
testWordList('POP_CULTURE_WORDS', POP_CULTURE_WORDS, 150);
testWordList('SCIENCE_WORDS', SCIENCE_WORDS, 150);
testWordList('SPACE_WORDS', SPACE_WORDS, 150);
testWordList('NATURE_WORDS', NATURE_WORDS, 150);

// ============================================================================
// getWordList
// ============================================================================

describe('getWordList', () => {
  it('returns CLASSIC_WORDS for "classic" pack', () => {
    expect(getWordList('classic')).toBe(CLASSIC_WORDS);
  });

  it('returns KAHOOT_WORDS for "kahoot" pack', () => {
    expect(getWordList('kahoot')).toBe(KAHOOT_WORDS);
  });

  it('returns GEOGRAPHY_WORDS for "geography" pack', () => {
    expect(getWordList('geography')).toBe(GEOGRAPHY_WORDS);
  });

  it('returns POP_CULTURE_WORDS for "popculture" pack', () => {
    expect(getWordList('popculture')).toBe(POP_CULTURE_WORDS);
  });

  it('returns SCIENCE_WORDS for "science" pack', () => {
    expect(getWordList('science')).toBe(SCIENCE_WORDS);
  });

  it('returns SPACE_WORDS for "space" pack', () => {
    expect(getWordList('space')).toBe(SPACE_WORDS);
  });

  it('returns NATURE_WORDS for "nature" pack', () => {
    expect(getWordList('nature')).toBe(NATURE_WORDS);
  });

  it('defaults to CLASSIC_WORDS when no pack specified', () => {
    expect(getWordList()).toBe(CLASSIC_WORDS);
  });
});

// ============================================================================
// getPackDisplayName
// ============================================================================

describe('getPackDisplayName', () => {
  it('returns correct display names for all packs', () => {
    expect(getPackDisplayName('classic')).toBe('Classic');
    expect(getPackDisplayName('kahoot')).toBe('Kahoot');
    expect(getPackDisplayName('geography')).toBe('Geography');
    expect(getPackDisplayName('popculture')).toBe('Pop Culture');
    expect(getPackDisplayName('science')).toBe('Science');
    expect(getPackDisplayName('space')).toBe('Space');
    expect(getPackDisplayName('nature')).toBe('Nature');
  });
});

// ============================================================================
// getAvailablePacks
// ============================================================================

describe('getAvailablePacks', () => {
  it('returns all available pack names', () => {
    const packs = getAvailablePacks();
    expect(packs).toContain('classic');
    expect(packs).toContain('kahoot');
    expect(packs).toContain('geography');
    expect(packs).toContain('popculture');
    expect(packs).toContain('science');
    expect(packs).toContain('space');
    expect(packs).toContain('nature');
  });

  it('returns exactly 7 packs', () => {
    expect(getAvailablePacks()).toHaveLength(7);
  });
});

// ============================================================================
// getCombinedWordList
// ============================================================================

describe('getCombinedWordList', () => {
  it('returns CLASSIC_WORDS for empty array', () => {
    expect(getCombinedWordList([])).toBe(CLASSIC_WORDS);
  });

  it('returns single pack words for single-element array', () => {
    expect(getCombinedWordList(['classic'])).toBe(CLASSIC_WORDS);
    expect(getCombinedWordList(['kahoot'])).toBe(KAHOOT_WORDS);
  });

  it('combines multiple packs', () => {
    const combined = getCombinedWordList(['classic', 'kahoot']);
    // Should have words from both packs
    expect(combined.length).toBeGreaterThan(CLASSIC_WORDS.length);
    expect(combined.length).toBeGreaterThan(KAHOOT_WORDS.length);
  });

  it('deduplicates words across packs', () => {
    const combined = getCombinedWordList(['classic', 'kahoot']);
    const uniqueWords = new Set(combined);
    expect(uniqueWords.size).toBe(combined.length);
  });

  it('contains words from all selected packs', () => {
    const combined = getCombinedWordList(['classic', 'geography', 'space']);
    const combinedSet = new Set(combined);
    
    // Check some words from each pack
    expect(combinedSet.has('AFRICA')).toBe(true); // classic
    expect(combinedSet.has('PARIS')).toBe(true); // geography
    expect(combinedSet.has('ASTRONAUT')).toBe(true); // space
  });

  it('combines all packs correctly', () => {
    const allPacks: WordPack[] = ['classic', 'kahoot', 'geography', 'popculture', 'science', 'space', 'nature'];
    const combined = getCombinedWordList(allPacks);
    
    // Should be unique
    const uniqueWords = new Set(combined);
    expect(uniqueWords.size).toBe(combined.length);
    
    // Should be large (sum minus overlaps)
    expect(combined.length).toBeGreaterThan(500);
  });
});

// ============================================================================
// getPackSelectionDisplayName
// ============================================================================

describe('getPackSelectionDisplayName', () => {
  it('returns display name for single pack string', () => {
    expect(getPackSelectionDisplayName('classic')).toBe('Classic');
    expect(getPackSelectionDisplayName('popculture')).toBe('Pop Culture');
  });

  it('returns "Classic" for empty array', () => {
    expect(getPackSelectionDisplayName([])).toBe('Classic');
  });

  it('returns single pack name for single-element array', () => {
    expect(getPackSelectionDisplayName(['science'])).toBe('Science');
  });

  it('returns joined names for multiple packs', () => {
    expect(getPackSelectionDisplayName(['classic', 'space'])).toBe('Classic + Space');
    expect(getPackSelectionDisplayName(['nature', 'science', 'geography'])).toBe('Nature + Science + Geography');
  });
});

// ============================================================================
// getWordCount
// ============================================================================

describe('getWordCount', () => {
  it('returns count for single pack', () => {
    expect(getWordCount('classic')).toBe(CLASSIC_WORDS.length);
    expect(getWordCount('kahoot')).toBe(KAHOOT_WORDS.length);
  });

  it('returns count for array of packs', () => {
    expect(getWordCount(['classic'])).toBe(CLASSIC_WORDS.length);
  });

  it('returns combined count for multiple packs', () => {
    const count = getWordCount(['classic', 'kahoot']);
    // Should be at least the larger of the two (they have few overlaps)
    expect(count).toBeGreaterThanOrEqual(CLASSIC_WORDS.length);
    expect(count).toBeGreaterThanOrEqual(KAHOOT_WORDS.length);
  });
});

// ============================================================================
// generateBoard
// ============================================================================

describe('generateBoard', () => {
  it('returns exactly 25 words', () => {
    const board = generateBoard();
    expect(board).toHaveLength(25);
  });

  it('returns unique words', () => {
    const board = generateBoard();
    const uniqueWords = new Set(board);
    expect(uniqueWords.size).toBe(25);
  });

  it('only uses words from CLASSIC_WORDS by default', () => {
    const board = generateBoard();
    const wordSet = new Set(CLASSIC_WORDS);
    board.forEach((word) => {
      expect(wordSet.has(word)).toBe(true);
    });
  });

  it('only uses words from CLASSIC_WORDS when "classic" pack specified', () => {
    const board = generateBoard('classic');
    const wordSet = new Set(CLASSIC_WORDS);
    board.forEach((word) => {
      expect(wordSet.has(word)).toBe(true);
    });
  });

  it('only uses words from KAHOOT_WORDS when "kahoot" pack specified', () => {
    const board = generateBoard('kahoot');
    const wordSet = new Set(KAHOOT_WORDS);
    board.forEach((word) => {
      expect(wordSet.has(word)).toBe(true);
    });
  });

  // Test all new packs generate valid boards
  const packTests: [WordPack, string[]][] = [
    ['geography', GEOGRAPHY_WORDS],
    ['popculture', POP_CULTURE_WORDS],
    ['science', SCIENCE_WORDS],
    ['space', SPACE_WORDS],
    ['nature', NATURE_WORDS],
  ];

  packTests.forEach(([pack, words]) => {
    it(`only uses words from ${pack.toUpperCase()} pack when specified`, () => {
      const board = generateBoard(pack);
      const wordSet = new Set(words);
      board.forEach((word) => {
        expect(wordSet.has(word)).toBe(true);
      });
    });
  });

  it('generates different boards on multiple calls (randomness test)', () => {
    const boards: string[][] = [];
    for (let i = 0; i < 10; i++) {
      boards.push(generateBoard());
    }

    // Check that not all boards are identical
    const firstBoardStr = boards[0].join(',');
    const allSame = boards.every((b) => b.join(',') === firstBoardStr);
    expect(allSame).toBe(false);
  });

  // Multi-pack tests
  describe('with multiple packs', () => {
    it('accepts an array of packs', () => {
      const board = generateBoard(['classic', 'space']);
      expect(board).toHaveLength(25);
    });

    it('returns unique words from combined packs', () => {
      const board = generateBoard(['classic', 'geography', 'nature']);
      const uniqueWords = new Set(board);
      expect(uniqueWords.size).toBe(25);
    });

    it('only uses words from the combined pack lists', () => {
      const board = generateBoard(['classic', 'space']);
      const combinedSet = new Set([...CLASSIC_WORDS, ...SPACE_WORDS]);
      board.forEach((word) => {
        expect(combinedSet.has(word)).toBe(true);
      });
    });

    it('works with single-element array', () => {
      const board = generateBoard(['kahoot']);
      const wordSet = new Set(KAHOOT_WORDS);
      board.forEach((word) => {
        expect(wordSet.has(word)).toBe(true);
      });
    });

    it('uses CLASSIC_WORDS for empty array', () => {
      const board = generateBoard([]);
      const wordSet = new Set(CLASSIC_WORDS);
      board.forEach((word) => {
        expect(wordSet.has(word)).toBe(true);
      });
    });

    it('can generate board from all packs combined', () => {
      const allPacks: WordPack[] = ['classic', 'kahoot', 'geography', 'popculture', 'science', 'space', 'nature'];
      const board = generateBoard(allPacks);
      expect(board).toHaveLength(25);
      
      // All words should be unique
      const uniqueWords = new Set(board);
      expect(uniqueWords.size).toBe(25);
    });
  });
});

// ============================================================================
// assignTeams
// ============================================================================

describe('assignTeams', () => {
  const testBoard = generateBoard();

  describe('card distribution', () => {
    it('assigns exactly 25 cards', () => {
      const result = assignTeams(testBoard, 'red');
      expect(result).toHaveLength(25);
    });

    it('starting team gets 9 cards', () => {
      const resultRed = assignTeams(testBoard, 'red');
      const redCount = resultRed.filter((c) => c.team === 'red').length;
      expect(redCount).toBe(9);

      const resultBlue = assignTeams(testBoard, 'blue');
      const blueCount = resultBlue.filter((c) => c.team === 'blue').length;
      expect(blueCount).toBe(9);
    });

    it('other team gets 8 cards', () => {
      const resultRed = assignTeams(testBoard, 'red');
      const blueCount = resultRed.filter((c) => c.team === 'blue').length;
      expect(blueCount).toBe(8);

      const resultBlue = assignTeams(testBoard, 'blue');
      const redCount = resultBlue.filter((c) => c.team === 'red').length;
      expect(redCount).toBe(8);
    });

    it('assigns exactly 7 neutral cards', () => {
      const result = assignTeams(testBoard, 'red');
      const neutralCount = result.filter((c) => c.team === 'neutral').length;
      expect(neutralCount).toBe(7);
    });

    it('assigns exactly 1 trap card', () => {
      const result = assignTeams(testBoard, 'red');
      const trapCount = result.filter((c) => c.team === 'trap').length;
      expect(trapCount).toBe(1);
    });

    it('total distribution is 9 + 8 + 7 + 1 = 25', () => {
      const result = assignTeams(testBoard, 'red');
      const starting = result.filter((c) => c.team === 'red').length;
      const other = result.filter((c) => c.team === 'blue').length;
      const neutral = result.filter((c) => c.team === 'neutral').length;
      const trap = result.filter((c) => c.team === 'trap').length;

      expect(starting + other + neutral + trap).toBe(25);
      expect(starting).toBe(9);
      expect(other).toBe(8);
      expect(neutral).toBe(7);
      expect(trap).toBe(1);
    });
  });

  describe('word preservation', () => {
    it('preserves all original words', () => {
      const result = assignTeams(testBoard, 'red');
      const resultWords = result.map((c) => c.word);
      expect(resultWords.sort()).toEqual([...testBoard].sort());
    });

    it('each card has a word property', () => {
      const result = assignTeams(testBoard, 'red');
      result.forEach((card) => {
        expect(typeof card.word).toBe('string');
        expect(card.word.length).toBeGreaterThan(0);
      });
    });

    it('each card has a team property', () => {
      const result = assignTeams(testBoard, 'red');
      const validTeams = ['red', 'blue', 'neutral', 'trap'];
      result.forEach((card) => {
        expect(validTeams).toContain(card.team);
      });
    });
  });

  describe('randomness', () => {
    it('team assignments are randomized', () => {
      // Run multiple times and check that trap is not always in same position
      const trapPositions: number[] = [];
      for (let i = 0; i < 20; i++) {
        const result = assignTeams(testBoard, 'red');
        const trapIndex = result.findIndex((c) => c.team === 'trap');
        trapPositions.push(trapIndex);
      }

      // Check that trap appears in different positions
      const uniquePositions = new Set(trapPositions);
      expect(uniquePositions.size).toBeGreaterThan(1);
    });
  });

  describe('starting team variants', () => {
    it('works correctly when red starts', () => {
      const result = assignTeams(testBoard, 'red');
      expect(result.filter((c) => c.team === 'red').length).toBe(9);
      expect(result.filter((c) => c.team === 'blue').length).toBe(8);
    });

    it('works correctly when blue starts', () => {
      const result = assignTeams(testBoard, 'blue');
      expect(result.filter((c) => c.team === 'blue').length).toBe(9);
      expect(result.filter((c) => c.team === 'red').length).toBe(8);
    });
  });
});
