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
    this.loadRealAssets();
    this.createPlaceholderAssets();
  }

  /**
   * Load real image assets from files.
   */
  private loadRealAssets(): void {
    // Background
    this.load.image(AssetKeys.BACKGROUND_IMAGE, 'assets/backgrounds/forest-night.png');

    // Character spritesheet: 8 columns × 3 rows (352×512 per frame)
    // Row 0: idle poses, Row 1: walk cycle, Row 2: wave animation
    this.load.spritesheet(AssetKeys.CHARACTER, 'assets/sprites/character.png', {
      frameWidth: 352,
      frameHeight: 512,
    });

    // Campfire spritesheet: 4 frames horizontal (704×1536 per frame)
    this.load.spritesheet(AssetKeys.CAMPFIRE, 'assets/sprites/campfire.png', {
      frameWidth: 704,
      frameHeight: 1536,
    });

    // Particle textures
    this.load.image(AssetKeys.EMBER, 'assets/sprites/ember.png');
    this.load.image(AssetKeys.FIREFLY, 'assets/sprites/firefly.png');
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

    // Note: EMBER and FIREFLY placeholders removed - we have real assets now
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
    // Process textures to make magenta (255,0,255) transparent
    // This is async, so we chain the operations
    this.processAllColorKeys().then(() => {
      this.createAnimations();
      console.log('Boot complete, starting CampfireScene');
      this.scene.start(SceneKeys.CAMPFIRE);
    });
  }

  /**
   * Process all textures to apply color key transparency.
   */
  private async processAllColorKeys(): Promise<void> {
    // Spritesheets need frame dimensions preserved
    await this.applyColorKeyToSpritesheet(AssetKeys.CHARACTER, 352, 512);
    await this.applyColorKeyToSpritesheet(AssetKeys.CAMPFIRE, 704, 1536);
    await this.applyColorKeyTransparency(AssetKeys.EMBER);
    await this.applyColorKeyTransparency(AssetKeys.FIREFLY);
  }

  /**
   * Replace magenta (255,0,255) pixels with transparency for a spritesheet.
   */
  private async applyColorKeyToSpritesheet(
    textureKey: string,
    frameWidth: number,
    frameHeight: number
  ): Promise<void> {
    if (!this.textures.exists(textureKey)) return;

    const image = await this.processColorKey(textureKey);
    if (!image) return;

    // Replace texture and re-add as spritesheet
    this.textures.remove(textureKey);
    this.textures.addSpriteSheet(textureKey, image, { frameWidth, frameHeight });
  }

  /**
   * Replace magenta (255,0,255) pixels with transparency for a single image.
   */
  private async applyColorKeyTransparency(textureKey: string): Promise<void> {
    if (!this.textures.exists(textureKey)) return;

    const image = await this.processColorKey(textureKey);
    if (!image) return;

    this.textures.remove(textureKey);
    this.textures.addImage(textureKey, image);
  }

  /**
   * Process a texture to replace magenta with transparency.
   * Returns an HTMLImageElement with the processed image.
   */
  private processColorKey(textureKey: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const texture = this.textures.get(textureKey);
      const source = texture.getSourceImage() as HTMLImageElement;

      console.log(`[ColorKey] Processing ${textureKey}: ${source.width}x${source.height}`);

      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log(`[ColorKey] Failed to get canvas context for ${textureKey}`);
        resolve(null);
        return;
      }

      ctx.drawImage(source, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Sample first few pixels to see what colors we have
      console.log(`[ColorKey] First pixel of ${textureKey}: R=${data[0]} G=${data[1]} B=${data[2]} A=${data[3]}`);
      // Sample corner pixel (likely background)
      console.log(`[ColorKey] Corner pixel: R=${data[0]} G=${data[1]} B=${data[2]}`);

      let transparentCount = 0;

      // Replace pink/magenta background pixels with transparent
      // The AI-generated images use various pink shades as background:
      // - R: 170-200, G: 20-60, B: 110-160
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check for pink/magenta background (matching AI image backgrounds)
        // These images have pinkish backgrounds, not pure magenta
        if (r > 160 && r < 210 && g < 70 && b > 100 && b < 170) {
          data[i + 3] = 0; // Set alpha to 0
          transparentCount++;
        }
      }

      console.log(`[ColorKey] Made ${transparentCount} pixels transparent in ${textureKey}`);

      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to image
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = canvas.toDataURL('image/png');
    });
  }

  /**
   * Create sprite animations from loaded spritesheets.
   */
  private createAnimations(): void {
    // Character animations (8 cols × 3 rows spritesheet)
    // Row 0 (frames 0-7): Idle poses
    // Row 1 (frames 8-15): Walk cycle
    // Row 2 (frames 16-23): Wave animation

    if (this.textures.exists(AssetKeys.CHARACTER)) {
      // Idle animation - single frame to avoid AI spritesheet alignment issues
      this.anims.create({
        key: 'character-idle',
        frames: this.anims.generateFrameNumbers(AssetKeys.CHARACTER, {
          frames: [0],
        }),
        frameRate: 1,
        repeat: -1,
      });

      // Walk animation - use frames 8,9 only (fewer frames = less visible misalignment)
      this.anims.create({
        key: 'character-walk',
        frames: this.anims.generateFrameNumbers(AssetKeys.CHARACTER, {
          frames: [8, 9],
        }),
        frameRate: 4,
        repeat: -1,
      });

      // Wave animation - row 2, first 2 frames
      this.anims.create({
        key: 'character-wave',
        frames: this.anims.generateFrameNumbers(AssetKeys.CHARACTER, {
          frames: [16, 17],
        }),
        frameRate: 3,
        repeat: 2,
      });
    }

    // Campfire animation (8 frames horizontal, use first 4)
    if (this.textures.exists(AssetKeys.CAMPFIRE)) {
      this.anims.create({
        key: 'campfire-burn',
        frames: this.anims.generateFrameNumbers(AssetKeys.CAMPFIRE, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}
