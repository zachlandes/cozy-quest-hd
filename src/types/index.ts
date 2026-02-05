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

// Action durations in milliseconds - used by all clients to know when an action expires
export const ActionDurations: Partial<Record<PlayerAction, number>> = {
  [PlayerActions.WAVING]: 2000, // ~2 seconds (matches animation: 2 frames × 3 repeats at 3fps)
};

// Scene keys
export const SceneKeys = {
  BOOT: 'Boot',
  CAMPFIRE: 'Campfire',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

// Asset keys
export const AssetKeys = {
  // Placeholder textures (generated programmatically)
  FIRE_PLACEHOLDER: 'fire-placeholder',
  CHARACTER_PLACEHOLDER: 'character-placeholder',
  GROUND_TEXTURE: 'ground-texture',

  // Real assets (loaded from files)
  BACKGROUND_IMAGE: 'background-image',
  CHARACTER: 'character',
  CAMPFIRE: 'campfire',
  EMBER: 'ember',
  FIREFLY: 'firefly',

  // Legacy (for procedural background)
  BACKGROUND: 'background',
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];

// Emote definitions for action menu
export interface EmoteOption {
  emoji: string;
  action: PlayerAction;
}

// Available emotes - single source of truth
export const Emotes: EmoteOption[] = [
  { emoji: '👋', action: PlayerActions.WAVING },
  // Future emotes:
  // { emoji: '🪵', action: PlayerActions.SITTING },
  // { emoji: '🤗', action: PlayerActions.HUGGING },
];
