import Phaser from 'phaser';
import { SceneKeys, AssetKeys } from '@/types';
import { GameConfig } from '@/config';

/**
 * BootScene - Asset loading and initialization
 *
 * Responsibilities:
 * - Display loading progress bar
 * - Generate placeholder assets (graphics-based, no external files needed)
 * - Transition to CampfireScene when ready
 *
 * Placeholder assets are created programmatically so we can iterate
 * on gameplay without waiting for art. They'll be replaced with real
 * sprites later.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.BOOT });
  }

  preload(): void {
    this.setupLoadingUI();
    this.createPlaceholderAssets();
  }

  /**
   * Simple loading bar - visible during asset loading.
   * Currently fast since we generate assets programmatically,
   * but will matter when we add real sprite sheets.
   */
  private setupLoadingUI(): void {
    const { width, height } = this.cameras.main;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const progressBar = this.add.graphics();

    const loadingText = this.add
      .text(width / 2, height / 2 - 50, 'Loading...', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(GameConfig.COLORS.EMBER, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  /**
   * Generate placeholder textures using Phaser's graphics API.
   * Each placeholder is a simple shape that communicates its purpose
   * while being obviously temporary.
   */
  private createPlaceholderAssets(): void {
    // Fire: orange circle, will be animated sprite sheet
    this.generateCircleTexture(
      AssetKeys.FIRE_PLACEHOLDER,
      32,
      GameConfig.COLORS.FIRE_GLOW
    );

    // Character: blue rounded rectangle, will be full sprite sheet
    this.generateCharacterTexture(AssetKeys.CHARACTER_PLACEHOLDER, 24, 32);

    // Ember particle: small orange dot
    this.generateCircleTexture(AssetKeys.EMBER, 4, GameConfig.COLORS.EMBER);

    // Firefly particle: small yellow dot
    this.generateCircleTexture(AssetKeys.FIREFLY, 4, GameConfig.COLORS.FIREFLY);
  }

  private generateCircleTexture(key: string, size: number, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(color);
    graphics.fillCircle(size / 2, size / 2, size / 2);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private generateCharacterTexture(key: string, width: number, height: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x4488ff); // Placeholder blue
    graphics.fillRoundedRect(0, 0, width, height, 4);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  create(): void {
    console.log('Boot complete, starting CampfireScene');
    this.scene.start(SceneKeys.CAMPFIRE);
  }
}
