import { describe, expect, it } from 'vitest';
import { isSuperPlayer, isTeacherPlayer } from './auth';

describe('privileged players', () => {
  it('recognizes irakasle as admin', () => {
    expect(isTeacherPlayer({ code: 'irakasle' })).toBe(true);
    expect(isSuperPlayer({ code: 'irakasle' })).toBe(false);
  });

  it('recognizes admin as super user and admin-capable user', () => {
    expect(isSuperPlayer({ code: 'admin' })).toBe(true);
    expect(isTeacherPlayer({ code: 'admin' })).toBe(true);
  });

  it('does not grant admin rights to regular users', () => {
    expect(isSuperPlayer({ code: 'ikasle1' })).toBe(false);
    expect(isTeacherPlayer({ code: 'ikasle1' })).toBe(false);
  });
});
