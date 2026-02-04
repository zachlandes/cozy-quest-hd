import Phaser from 'phaser';

/**
 * ActionMenu - Small popup menu for character actions
 *
 * Appears when clicking on your own character.
 * Shows emoticon buttons in a small row/arc above the character.
 * Clicking an emoticon triggers the action and closes the menu.
 * Clicking elsewhere closes the menu.
 *
 * Visual style: minimal, semi-transparent background, emoji-style icons
 */

export interface ActionOption {
  emoji: string;
  action: string;
}

export class ActionMenu extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Text[] = [];
  private onAction: (action: string) => void;

  // Menu styling
  private static readonly BUTTON_SIZE = 36;
  private static readonly BUTTON_SPACING = 8;
  private static readonly PADDING = 8;
  private static readonly BG_COLOR = 0x000000;
  private static readonly BG_ALPHA = 0.6;
  private static readonly CORNER_RADIUS = 8;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: ActionOption[],
    onAction: (action: string) => void
  ) {
    super(scene, x, y);
    this.onAction = onAction;

    // Calculate dimensions
    const totalWidth =
      options.length * ActionMenu.BUTTON_SIZE +
      (options.length - 1) * ActionMenu.BUTTON_SPACING +
      ActionMenu.PADDING * 2;
    const totalHeight = ActionMenu.BUTTON_SIZE + ActionMenu.PADDING * 2;

    // Create semi-transparent background
    this.background = scene.add.graphics();
    this.background.fillStyle(ActionMenu.BG_COLOR, ActionMenu.BG_ALPHA);
    this.background.fillRoundedRect(
      -totalWidth / 2,
      -totalHeight,
      totalWidth,
      totalHeight,
      ActionMenu.CORNER_RADIUS
    );
    this.add(this.background);

    // Create emoji buttons
    const startX = -totalWidth / 2 + ActionMenu.PADDING + ActionMenu.BUTTON_SIZE / 2;
    options.forEach((option, index) => {
      const buttonX = startX + index * (ActionMenu.BUTTON_SIZE + ActionMenu.BUTTON_SPACING);
      const buttonY = -totalHeight / 2;

      const button = scene.add.text(buttonX, buttonY, option.emoji, {
        fontSize: '24px',
      });
      button.setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });

      // Hover effect
      button.on('pointerover', () => {
        button.setScale(1.2);
      });
      button.on('pointerout', () => {
        button.setScale(1);
      });

      // Click handler
      button.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.onAction(option.action);
        this.close();
      });

      this.add(button);
      this.buttons.push(button);
    });

    // Set high depth so it appears above everything
    this.setDepth(10000);

    // Add to scene
    scene.add.existing(this);

    // Animate in
    this.setScale(0.5);
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Close the menu with animation.
   */
  close(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 0.5,
      alpha: 0,
      duration: 100,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  /**
   * Clean up.
   */
  destroy(fromScene?: boolean): void {
    this.buttons.forEach((b) => b.destroy());
    this.background.destroy();
    super.destroy(fromScene);
  }
}
