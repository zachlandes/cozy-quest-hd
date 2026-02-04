import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CampfireScene } from './scenes/CampfireScene';

// Game dimensions
// Using 16:9 aspect ratio for modern Discord Activities
// Base resolution that scales well
export const GameConfig = {
  // Rendered resolution (what Phaser draws at)
  WIDTH: 1280,
  HEIGHT: 720,

  // World dimensions (gameplay area)
  WORLD: {
    GROUND_HEIGHT: 180, // Height of the ground area from bottom
  },

  // Visual settings
  COLORS: {
    BACKGROUND_TOP: 0x141428, // Dark night sky
    BACKGROUND_BOTTOM: 0x1a1a2e, // Slightly lighter at horizon
    GROUND: 0x2d4a3e, // Dark forest green
    GROUND_ACCENT: 0x3d5a4e, // Lighter grass accents
    FIRE_GLOW: 0xff6600, // Orange fire
    EMBER: 0xffaa00, // Orange-yellow embers
    FIREFLY: 0xffffaa, // Pale yellow fireflies
  },

  // Animation timings
  TIMING: {
    FIRE_PULSE_MS: 300,
    FIREFLY_DRIFT_MS: 2000,
    EMBER_LIFESPAN_MS: 2000,
  },

  // Counts
  COUNTS: {
    FIREFLIES: 8,
  },
} as const;

// Phaser game configuration
export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GameConfig.WIDTH,
    height: GameConfig.HEIGHT,
    parent: 'game-container',
    backgroundColor: GameConfig.COLORS.BACKGROUND_BOTTOM,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, CampfireScene],
  };
}
