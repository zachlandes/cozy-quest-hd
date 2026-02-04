// User types
export interface User {
  id: string;
  username: string;
  avatar?: string;
}

// Player state for multiplayer sync
export interface PlayerState {
  id: string;
  username: string;
  x: number;
  y: number;
  action: PlayerAction;
  actionTime: number;
}

export const PlayerActions = {
  IDLE: 'idle',
  WALKING: 'walking',
  WAVING: 'waving',
} as const;

export type PlayerAction = (typeof PlayerActions)[keyof typeof PlayerActions];

// Scene keys
export const SceneKeys = {
  BOOT: 'Boot',
  CAMPFIRE: 'Campfire',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

// Asset keys
export const AssetKeys = {
  // Textures
  FIRE_PLACEHOLDER: 'fire-placeholder',
  CHARACTER_PLACEHOLDER: 'character-placeholder',
  EMBER: 'ember',
  FIREFLY: 'firefly',
  BACKGROUND: 'background',
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];
