import { afterEach, describe, expect, it, vi } from 'vitest';
import { readGrammarProgress, writeGrammarProgress } from './grammarProgress';

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

describe('grammarProgress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists progress per player and clamps negative values', () => {
    const localStorage = createStorage();
    vi.stubGlobal('window', { localStorage });

    writeGrammarProgress('player-a', 3);
    writeGrammarProgress('player-b', -5);

    expect(readGrammarProgress('player-a')).toBe(3);
    expect(readGrammarProgress('player-b')).toBe(0);
    expect(readGrammarProgress('missing')).toBe(0);
  });

  it('fails safely when storage is unavailable', () => {
    vi.stubGlobal('window', {});

    expect(readGrammarProgress('player-a')).toBe(0);
    expect(() => writeGrammarProgress('player-a', 4)).not.toThrow();
  });
});
