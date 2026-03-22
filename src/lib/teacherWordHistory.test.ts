import { describe, expect, it } from 'vitest';
import { normalizeTeacherWordHistory, recordTeacherWordHistoryItem } from './teacherWordHistory';

describe('teacherWordHistory', () => {
  it('mantiene solo los ultimos cambios validos ordenados por fecha', () => {
    const items = normalizeTeacherWordHistory([
      { word: 'zahar', action: 'updated', changedAt: '2026-03-20T10:00:00.000Z', changedBy: 'irakaslea' },
      { word: 'berri', action: 'created', changedAt: '2026-03-21T10:00:00.000Z', changedBy: 'admin' },
      { word: '', action: 'created', changedAt: '2026-03-21T11:00:00.000Z', changedBy: 'admin' },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.word).toBe('berri');
    expect(items[1]?.word).toBe('zahar');
  });

  it('agrega un cambio nuevo al principio del historial', () => {
    const items = recordTeacherWordHistoryItem(
      [{ word: 'zaharra', action: 'updated', changedAt: '2026-03-20T10:00:00.000Z', changedBy: 'irakaslea' }],
      { word: 'berria', action: 'created', changedAt: '2026-03-21T10:00:00.000Z', changedBy: 'admin' }
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.word).toBe('berria');
    expect(items[0]?.changedBy).toBe('admin');
  });
});
