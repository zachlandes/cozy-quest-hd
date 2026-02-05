import Phaser from 'phaser';
import { AssetKeys, PlayerActions, type PlayerAction } from '@/types';

/**
 * Character - A player sprite with name label
 *
 * Composition:
 * - Container (this) - groups sprite + label, handles depth sorting
 * - Sprite - the visual character (placeholder or real sprite sheet)
 * - Name label - text above the character
 *
 * Responsibilities:
 * - Display character at a position
 * - Animate movement via tweens
 * - Play action animations (idle, walk, wave)
 * - Show player name
 *
 * Used for both local player (responds to input) and remote players
 * (responds to network state updates).
 */
export class Character extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameLabel: Phaser.GameObjects.Text;
  private moveTween: Phaser.Tweens.Tween | null = null;
  private currentAction: PlayerAction = PlayerActions.IDLE;

  // Movement speed in pixels per second
  private static readonly MOVE_SPEED = 150;

  private readonly playerId: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: string,
    playerName: string
  ) {
    super(scene, x, y);
    this.playerId = playerId;

    // Use real character spritesheet or fallback to placeholder
    const charKey = scene.textures.exists(AssetKeys.CHARACTER)
      ? AssetKeys.CHARACTER
      : AssetKeys.CHARACTER_PLACEHOLDER;

    this.sprite = scene.add.sprite(0, 0, charKey);
    this.sprite.setOrigin(0.5, 1); // Bottom-center origin for ground placement
    // Spritesheet frame is 352×512, scale to ~64px tall
    if (charKey === AssetKeys.CHARACTER) {
      this.sprite.setScale(0.25);
    }
    this.sprite.setPipeline('Light2D'); // Affected by campfire lighting
    this.add(this.sprite);

    // Create the name label above the sprite
    this.nameLabel = scene.add.text(0, -this.sprite.displayHeight - 8, playerName, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // Set container depth based on Y position (for sprite sorting)
    this.setDepth(y);

    // Add to scene
    scene.add.existing(this);

    // Start idle animation
    this.playIdle();
  }

  /**
   * Make this character clickable.
   * Returns the character for chaining.
   */
  setInteractive(): this {
    // Set interactive hit area based on sprite size
    const hitArea = new Phaser.Geom.Rectangle(
      -this.sprite.width / 2,
      -this.sprite.height,
      this.sprite.width,
      this.sprite.height
    );

    super.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    return this;
  }

  /**
   * Check if a world point is within this character's bounds.
   * Useful for click detection before Phaser's built-in hit testing.
   */
  containsPoint(worldX: number, worldY: number): boolean {
    const localX = worldX - this.x;
    const localY = worldY - this.y;

    // Check against displayed sprite bounds (origin is bottom-center)
    return (
      localX >= -this.sprite.displayWidth / 2 &&
      localX <= this.sprite.displayWidth / 2 &&
      localY >= -this.sprite.displayHeight &&
      localY <= 0
    );
  }

  /**
   * Move the character to a target position with animation.
   * Returns a promise that resolves when movement completes.
   */
  walkTo(targetX: number, targetY: number): Promise<void> {
    return new Promise((resolve) => {
      // Cancel any existing movement
      if (this.moveTween) {
        this.moveTween.stop();
      }

      // Calculate distance and duration
      const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const duration = (distance / Character.MOVE_SPEED) * 1000;

      // Skip if already at target
      if (distance < 1) {
        resolve();
        return;
      }

      // Flip sprite based on movement direction
      if (targetX < this.x) {
        this.sprite.setFlipX(true);
      } else if (targetX > this.x) {
        this.sprite.setFlipX(false);
      }

      // Play walk animation
      this.currentAction = PlayerActions.WALKING;
      if (this.scene.anims.exists('character-walk')) {
        this.sprite.play('character-walk');
      }

      // Create movement tween
      this.moveTween = this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Linear',
        onUpdate: () => {
          // Update depth for sprite sorting (higher Y = in front)
          this.setDepth(this.y);
        },
        onComplete: () => {
          this.moveTween = null;
          this.playIdle();
          resolve();
        },
      });
    });
  }

  /**
   * Immediately set position without animation.
   * Used for initial spawn or network corrections.
   */
  setPosition(x: number, y: number): this {
    super.setPosition(x, y);
    this.setDepth(y);
    return this;
  }

  /**
   * Play the idle animation.
   */
  private playIdle(): void {
    this.currentAction = PlayerActions.IDLE;

    // Use spritesheet animation if available
    if (this.scene.anims.exists('character-idle')) {
      this.sprite.play('character-idle');
    } else {
      // Fallback: subtle breathing animation on placeholder
      this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 1.02,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Play the wave animation.
   * Returns a promise that resolves when the animation completes.
   */
  playWave(): Promise<void> {
    return new Promise((resolve) => {
      this.currentAction = PlayerActions.WAVING;

      // Stop any existing animations/tweens
      this.sprite.stop();
      this.scene.tweens.killTweensOf(this.sprite);

      if (this.scene.anims.exists('character-wave')) {
        this.sprite.play('character-wave');
        this.sprite.once('animationcomplete', () => {
          this.playIdle();
          resolve();
        });
      } else {
        // Fallback: tween-based wave for placeholder sprites
        this.scene.tweens.chain({
          targets: this.sprite,
          tweens: [
            { angle: -8, duration: 120 },
            { angle: 8, duration: 120 },
            { angle: -8, duration: 120 },
            { angle: 8, duration: 120 },
            { angle: 0, duration: 120 },
          ],
          onComplete: () => {
            this.playIdle();
            resolve();
          },
        });
      }
    });
  }

  /**
   * Stop all movement and animations.
   */
  stop(): void {
    if (this.moveTween) {
      this.moveTween.stop();
      this.moveTween = null;
    }
    this.sprite.stop();
    this.scene.tweens.killTweensOf(this.sprite);
    this.playIdle();
  }

  /**
   * Get the current action state.
   */
  getAction(): PlayerAction {
    return this.currentAction;
  }

  /**
   * Get the world Y position of the top of the character's head.
   */
  getHeadY(): number {
    return this.y - this.sprite.displayHeight;
  }

  /**
   * Get the player ID.
   */
  getId(): string {
    return this.playerId;
  }

  /**
   * Check if currently moving.
   */
  isMoving(): boolean {
    return this.moveTween !== null && this.moveTween.isPlaying();
  }

  /**
   * Clean up when removing from scene.
   */
  destroy(fromScene?: boolean): void {
    this.stop();
    super.destroy(fromScene);
  }
}
