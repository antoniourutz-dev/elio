import { describe, expect, it } from 'vitest';
import { normalizeTeacherPlayerHistory, recordTeacherPlayerHistoryItem } from './teacherPlayerHistory';

describe('teacherPlayerHistory', () => {
  it('mantiene solo cambios validos ordenados por fecha', () => {
    const items = normalizeTeacherPlayerHistory([
      { playerCode: 'amaia', action: 'updated', changedAt: '2026-03-20T10:00:00.000Z', changedBy: 'irakaslea' },
      { playerCode: 'urko', action: 'created', changedAt: '2026-03-21T10:00:00.000Z', changedBy: 'admin' },
      { playerCode: '', action: 'created', changedAt: '2026-03-21T11:00:00.000Z', changedBy: 'admin' },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.playerCode).toBe('urko');
    expect(items[1]?.playerCode).toBe('amaia');
  });

  it('agrega un cambio nuevo al principio', () => {
    const items = recordTeacherPlayerHistoryItem(
      [{ playerCode: 'amaia', action: 'updated', changedAt: '2026-03-20T10:00:00.000Z', changedBy: 'irakaslea' }],
      { playerCode: 'urko', action: 'created', changedAt: '2026-03-21T10:00:00.000Z', changedBy: 'admin' }
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.playerCode).toBe('urko');
    expect(items[0]?.changedBy).toBe('admin');
  });
});
