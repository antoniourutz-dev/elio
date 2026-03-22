import { describe, expect, it } from 'vitest';
import { PLAYER_AVATARS, assignAvatarId, getAvatarForPlayer } from './avatars';

describe('avatars', () => {
  it('asigna un avatar estable a partir del userId', () => {
    const first = assignAvatarId('player-123');
    const second = assignAvatarId('player-123');

    expect(first).toBe(second);
    expect(PLAYER_AVATARS.some((avatar) => avatar.id === first)).toBe(true);
  });

  it('usa el avatar ya guardado si existe en el jugador', () => {
    const avatar = getAvatarForPlayer({
      userId: 'player-123',
      avatarId: 'fox',
    });

    expect(avatar.id).toBe('fox');
    expect(avatar.src).toBe('/avatars/fox-face-icon.svg');
  });
});
