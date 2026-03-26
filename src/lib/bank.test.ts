import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectSupabaseRowsMock = vi.fn();

vi.mock('./supabaseConfig', () => ({
  isSupabaseConfigured: true,
  synonymsTable: 'synonyms',
}));

vi.mock('./supabaseRest', () => ({
  selectSupabaseRows: selectSupabaseRowsMock,
}));

vi.mock('./runtime', () => ({
  isDevRuntime: vi.fn(),
}));

describe('loadSynonymBank', () => {
  beforeEach(() => {
    vi.resetModules();
    selectSupabaseRowsMock.mockReset();
  });

  it('returns a hard failure in production when Supabase read fails', async () => {
    const runtime = await import('./runtime');
    vi.mocked(runtime.isDevRuntime).mockReturnValue(false);
    selectSupabaseRowsMock.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });

    const { loadSynonymBank } = await import('./bank');
    const result = await loadSynonymBank();

    expect(result.ok).toBe(false);
    expect(result.entries).toEqual([]);
    expect(result.message).toContain('permission denied');
  });

  it('keeps demo fallback available in development', async () => {
    const runtime = await import('./runtime');
    vi.mocked(runtime.isDevRuntime).mockReturnValue(true);
    selectSupabaseRowsMock.mockResolvedValue({
      data: null,
      error: { message: 'network down' },
    });

    const { loadSynonymBank } = await import('./bank');
    const result = await loadSynonymBank();

    expect(result.ok).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.message).toContain('Demoko hitzak');
  });
});
