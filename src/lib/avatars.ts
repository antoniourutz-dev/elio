import type { PlayerIdentity } from './types';

export interface PlayerAvatarDefinition {
  id: string;
  label: string;
  src: string;
}

export const PLAYER_AVATARS: PlayerAvatarDefinition[] = [
  { id: 'man-user', label: 'Jokalari', src: '/avatars/man-user-color-icon.svg' },
  { id: 'bear', label: 'Hartza', src: '/avatars/bear-with-tree-icon.svg' },
  { id: 'dog', label: 'Txakurra', src: '/avatars/dog-face-icon.svg' },
  { id: 'goat', label: 'Ahuntza', src: '/avatars/goat-face-icon.svg' },
  { id: 'lion', label: 'Lehoia', src: '/avatars/lion-color-icon.svg' },
  { id: 'monkey', label: 'Tximinoa', src: '/avatars/monkey-face-cartoon-icon.svg' },
  { id: 'fox', label: 'Azeria', src: '/avatars/fox-face-icon.svg' },
  { id: 'sheep', label: 'Ardia', src: '/avatars/sheep-face-icon.svg' },
  { id: 'cow', label: 'Behia', src: '/avatars/cow-face-icon.svg' },
  { id: 'deer', label: 'Oreina', src: '/avatars/deer-face-color-icon.svg' },
];

const DEFAULT_AVATAR = PLAYER_AVATARS[0];

const hashText = (value: string): number => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

export const assignAvatarId = (userId: string): string => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return DEFAULT_AVATAR.id;
  }

  const avatarIndex = hashText(normalizedUserId) % PLAYER_AVATARS.length;
  return PLAYER_AVATARS[avatarIndex]?.id ?? DEFAULT_AVATAR.id;
};

export const getAvatarById = (avatarId: string | null | undefined): PlayerAvatarDefinition =>
  PLAYER_AVATARS.find((avatar) => avatar.id === avatarId) ?? DEFAULT_AVATAR;

export const getAvatarForPlayer = (player: Pick<PlayerIdentity, 'userId' | 'avatarId'>): PlayerAvatarDefinition =>
  getAvatarById(player.avatarId ?? assignAvatarId(player.userId));
