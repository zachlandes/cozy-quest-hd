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
   * Replace magenta pixels with transparency for a spritesheet,
   * then align frames so art centers match across animation frames.
   */
  private async applyColorKeyToSpritesheet(
    textureKey: string,
    frameWidth: number,
    frameHeight: number
  ): Promise<void> {
    if (!this.textures.exists(textureKey)) return;

    const canvas = this.applyColorKeyToCanvas(textureKey);
    if (!canvas) return;

    this.alignFrames(canvas, frameWidth, frameHeight);

    const image = await this.canvasToImage(canvas);
    if (!image) return;

    this.textures.remove(textureKey);
    this.textures.addSpriteSheet(textureKey, image, { frameWidth, frameHeight });
  }

  /**
   * Replace magenta pixels with transparency for a single image.
   */
  private async applyColorKeyTransparency(textureKey: string): Promise<void> {
    if (!this.textures.exists(textureKey)) return;

    const canvas = this.applyColorKeyToCanvas(textureKey);
    if (!canvas) return;

    const image = await this.canvasToImage(canvas);
    if (!image) return;

    this.textures.remove(textureKey);
    this.textures.addImage(textureKey, image);
  }

  /**
   * Apply color key transparency to a texture, returning the canvas
   * for further processing (e.g. frame alignment).
   */
  private applyColorKeyToCanvas(textureKey: string): HTMLCanvasElement | null {
    const texture = this.textures.get(textureKey);
    const source = texture.getSourceImage() as HTMLImageElement;

    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r > 160 && r < 210 && g < 70 && b > 100 && b < 170) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Align frames within a spritesheet so each row's art shares
   * the same horizontal center and vertical baseline.
   *
   * Center-x is computed from the bottom 40% of visible content only,
   * so limb movement (waving arms) doesn't shift the body.
   */
  private alignFrames(
    canvas: HTMLCanvasElement,
    frameWidth: number,
    frameHeight: number
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = Math.floor(canvas.width / frameWidth);
    const rows = Math.floor(canvas.height / frameHeight);

    for (let row = 0; row < rows; row++) {
      const frameBounds: Array<{ centerX: number; bottom: number; empty: boolean }> = [];

      for (let col = 0; col < cols; col++) {
        const fx = col * frameWidth;
        const fy = row * frameHeight;
        const frameData = ctx.getImageData(fx, fy, frameWidth, frameHeight);
        const d = frameData.data;

        // First pass: find the bottom of visible content
        let maxY = 0;
        let minY = frameHeight;
        let hasPixels = false;

        for (let y = 0; y < frameHeight; y++) {
          for (let x = 0; x < frameWidth; x++) {
            if (d[(y * frameWidth + x) * 4 + 3] > 0) {
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
              hasPixels = true;
            }
          }
        }

        if (!hasPixels) {
          frameBounds.push({ centerX: 0, bottom: 0, empty: true });
          continue;
        }

        // Second pass: compute center-x from bottom 40% of visible content
        // (feet/legs area — stable across poses with arm movement)
        const visibleHeight = maxY - minY;
        const bottomThreshold = maxY - visibleHeight * 0.4;
        let bMinX = frameWidth;
        let bMaxX = 0;

        for (let y = Math.floor(bottomThreshold); y <= maxY; y++) {
          for (let x = 0; x < frameWidth; x++) {
            if (d[(y * frameWidth + x) * 4 + 3] > 0) {
              bMinX = Math.min(bMinX, x);
              bMaxX = Math.max(bMaxX, x);
            }
          }
        }

        frameBounds.push({
          centerX: (bMinX + bMaxX) / 2,
          bottom: maxY,
          empty: false,
        });
      }

      // Use first non-empty frame as reference
      const ref = frameBounds.find((b) => !b.empty);
      if (!ref) continue;

      // Shift each subsequent frame to align with reference
      for (let col = 0; col < cols; col++) {
        const bounds = frameBounds[col];
        if (bounds.empty) continue;

        const dx = Math.round(ref.centerX - bounds.centerX);
        const dy = Math.round(ref.bottom - bounds.bottom);
        if (dx === 0 && dy === 0) continue;

        const fx = col * frameWidth;
        const fy = row * frameHeight;

        // Extract frame, clear it, redraw shifted
        const frameData = ctx.getImageData(fx, fy, frameWidth, frameHeight);
        ctx.clearRect(fx, fy, frameWidth, frameHeight);

        const tmp = document.createElement('canvas');
        tmp.width = frameWidth;
        tmp.height = frameHeight;
        const tmpCtx = tmp.getContext('2d')!;
        tmpCtx.putImageData(frameData, 0, 0);

        ctx.drawImage(tmp, fx + dx, fy + dy);

        console.log(`[Align] Row ${row} frame ${col}: shifted by (${dx}, ${dy})`);
      }
    }
  }

  private canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
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

      // Wave animation - frames aligned at load time (bottom-anchored)
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
