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
    BACKGROUND_TOP: 0x0a0a14, // Darker night sky for better light contrast
    BACKGROUND_BOTTOM: 0x141428, // Slightly lighter at horizon
    GROUND: 0x1a2e24, // Darker forest green (lights will brighten)
    GROUND_ACCENT: 0x2d4a3e, // Lighter grass accents
    FIRE_GLOW: 0xff6600, // Orange fire
    EMBER: 0xffaa00, // Orange-yellow embers
    FIREFLY: 0xffffaa, // Pale yellow fireflies
  },

  // Lighting settings (HD-2D style)
  LIGHTING: {
    AMBIENT_COLOR: 0x222244, // Cool blue ambient (outside firelight)
    AMBIENT_INTENSITY: 0.3, // Low ambient for contrast
    FIRE_COLOR: 0xff8844, // Warm orange firelight
    FIRE_INTENSITY: 1.8, // Bright fire
    FIRE_RADIUS: 350, // How far the light reaches
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
