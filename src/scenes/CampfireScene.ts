import Phaser from 'phaser';
import { SceneKeys, AssetKeys } from '@/types';
import type { User } from '@/types';
import { GameConfig } from '@/config';

/**
 * CampfireScene - The main game scene
 *
 * Responsibilities:
 * - Render the cozy campfire environment (background, ground, fire, particles)
 * - Spawn and manage the local player character
 * - Handle input for movement and actions
 * - Sync with other players via NetworkManager (coming later)
 *
 * Visual layers (back to front):
 * 1. Gradient night sky background
 * 2. Ground plane
 * 3. Campfire with embers
 * 4. Characters
 * 5. Fireflies (additive blend, float above everything)
 */
export class CampfireScene extends Phaser.Scene {
  private user: User | null = null;

  constructor() {
    super({ key: SceneKeys.CAMPFIRE });
  }

  create(): void {
    this.user = this.registry.get('user') as User | null;

    // Build the scene layers in order
    this.createBackground();
    this.createGround();
    this.createCampfire();
    this.createFireflies();

    // Temporary welcome text - will remove once characters work
    const welcomeText = this.user
      ? `Welcome, ${this.user.username}!`
      : 'Welcome to Cozy Quest HD!';

    this.add
      .text(this.cameras.main.centerX, 50, welcomeText, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    console.log('CampfireScene created');
  }

  /**
   * Night sky gradient - dark blue at top fading to slightly lighter at horizon.
   * Creates the atmosphere before any objects are placed.
   */
  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Procedural gradient - could be replaced with a texture later
    for (let y = 0; y < height; y++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(GameConfig.COLORS.BACKGROUND_TOP),
        Phaser.Display.Color.IntegerToColor(GameConfig.COLORS.BACKGROUND_BOTTOM),
        height,
        y
      );
      graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      graphics.fillRect(0, y, width, 1);
    }

    graphics.generateTexture(AssetKeys.BACKGROUND, width, height);
    this.add.image(0, 0, AssetKeys.BACKGROUND).setOrigin(0);
    graphics.destroy();
  }

  /**
   * Ground plane - simple dark green with grass tufts for texture.
   * Characters will walk on this area.
   */
  private createGround(): void {
    const { width, height } = this.cameras.main;
    const groundY = height - GameConfig.WORLD.GROUND_HEIGHT;

    const graphics = this.add.graphics();

    // Base ground color
    graphics.fillStyle(GameConfig.COLORS.GROUND);
    graphics.fillRect(0, groundY, width, GameConfig.WORLD.GROUND_HEIGHT);

    // Grass tufts for visual texture
    graphics.fillStyle(GameConfig.COLORS.GROUND_ACCENT);
    for (let x = 0; x < width; x += 20) {
      const tuftHeight = 5 + Math.random() * 10;
      graphics.fillRect(x, groundY - tuftHeight, 3, tuftHeight);
    }
  }

  /**
   * Campfire - the focal point of the scene.
   * Placeholder sprite with pulsing tween + ember particles rising.
   */
  private createCampfire(): void {
    const centerX = this.cameras.main.centerX;
    const groundY = this.cameras.main.height - GameConfig.WORLD.GROUND_HEIGHT;
    const fireY = groundY - 20;

    // Fire sprite with pulsing animation
    const fire = this.add.sprite(centerX, fireY, AssetKeys.FIRE_PLACEHOLDER);
    fire.setScale(2);

    this.tweens.add({
      targets: fire,
      scaleX: 2.2,
      scaleY: 2.3,
      duration: GameConfig.TIMING.FIRE_PULSE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Ember particles rising from the fire
    this.add.particles(centerX, fireY - 10, AssetKeys.EMBER, {
      speed: { min: 20, max: 50 },
      angle: { min: 250, max: 290 }, // Upward cone
      scale: { start: 1, end: 0 },
      lifespan: GameConfig.TIMING.EMBER_LIFESPAN_MS,
      frequency: 200,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  /**
   * Fireflies - ambient particles scattered around the scene.
   * They drift slowly with randomized paths and fade in/out.
   */
  private createFireflies(): void {
    const { width, height } = this.cameras.main;
    const groundY = height - GameConfig.WORLD.GROUND_HEIGHT;

    for (let i = 0; i < GameConfig.COUNTS.FIREFLIES; i++) {
      // Random position in the air (not on ground)
      const x = 50 + Math.random() * (width - 100);
      const y = 100 + Math.random() * (groundY - 200);

      const firefly = this.add.sprite(x, y, AssetKeys.FIREFLY);
      firefly.setAlpha(0.5);
      firefly.setBlendMode(Phaser.BlendModes.ADD);

      // Gentle drifting motion with fade
      this.tweens.add({
        targets: firefly,
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 60,
        alpha: { from: 0.3, to: 0.8 },
        duration: GameConfig.TIMING.FIREFLY_DRIFT_MS + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  update(): void {
    // Character movement and network sync will go here
  }
}
