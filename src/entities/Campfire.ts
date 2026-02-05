import Phaser from 'phaser';
import { AssetKeys } from '@/types';
import { GameConfig } from '@/config';

/**
 * Campfire - The focal point of the scene
 *
 * Composition:
 * - Container (this) - groups fire sprite + ember particles
 * - Fire sprite - animated campfire at (0, 0), origin bottom-center
 * - Ember particles - rising from above the flames
 * - Fire light - managed separately (Phaser lights aren't game objects)
 *
 * Position the container at ground level; the fire sprite's
 * bottom-center origin makes the stone base sit at that point.
 */
export class Campfire extends Phaser.GameObjects.Container {
  private fireLight: Phaser.GameObjects.Light | null = null;

  private static readonly FIRE_SCALE = 0.14;
  private static readonly SPRITE_OFFSET_Y = 80; // Compensate for empty space below art in frame
  private static readonly LIGHT_OFFSET_Y = -40;
  private static readonly EMBER_OFFSET_Y = -100;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.createFireSprite();
    this.createFireLight();
    this.createEmberParticles();

    scene.add.existing(this);
  }

  private createFireSprite(): void {
    const fireKey = this.scene.textures.exists(AssetKeys.CAMPFIRE)
      ? AssetKeys.CAMPFIRE
      : AssetKeys.FIRE_PLACEHOLDER;

    const fireScale = fireKey === AssetKeys.CAMPFIRE ? Campfire.FIRE_SCALE : 2;

    const sprite = this.scene.add.sprite(0, Campfire.SPRITE_OFFSET_Y, fireKey);
    sprite.setScale(fireScale);
    sprite.setOrigin(0.5, 1);
    sprite.setPipeline('Light2D');
    this.add(sprite);

    // Static frame — campfire spritesheet frames vary too much for smooth animation
    sprite.setFrame(0);
  }

  private createFireLight(): void {
    this.fireLight = this.scene.lights.addLight(
      this.x,
      this.y + Campfire.LIGHT_OFFSET_Y,
      GameConfig.LIGHTING.FIRE_RADIUS,
      GameConfig.LIGHTING.FIRE_COLOR,
      GameConfig.LIGHTING.FIRE_INTENSITY
    );

    this.scene.tweens.add({
      targets: this.fireLight,
      intensity: { from: 1.6, to: 2.0 },
      radius: { from: 330, to: 370 },
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createEmberParticles(): void {
    const emberScale = this.scene.textures.exists(AssetKeys.EMBER) ? 0.015 : 1;

    const emitter = this.scene.add.particles(
      0,
      Campfire.EMBER_OFFSET_Y,
      AssetKeys.EMBER,
      {
        speed: { min: 20, max: 50 },
        angle: { min: 250, max: 290 },
        scale: { start: emberScale, end: 0 },
        lifespan: GameConfig.TIMING.EMBER_LIFESPAN_MS,
        frequency: 200,
        blendMode: Phaser.BlendModes.ADD,
      }
    );
    this.add(emitter);
  }

  destroy(fromScene?: boolean): void {
    if (this.fireLight) {
      this.scene.lights.removeLight(this.fireLight);
      this.fireLight = null;
    }
    super.destroy(fromScene);
  }
}
