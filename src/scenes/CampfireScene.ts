import Phaser from 'phaser';
import { SceneKeys, AssetKeys, PlayerActions, Emotes } from '@/types';
import type { User, PlayerAction, PlayerState } from '@/types';
import { GameConfig } from '@/config';
import { Character } from '@/entities/Character';
import { Campfire } from '@/entities/Campfire';
import { ActionMenu } from '@/ui/ActionMenu';
import { NetworkManager } from '@/managers/NetworkManager';

/**
 * CampfireScene - The main game scene
 *
 * Responsibilities:
 * - Render the cozy campfire environment (background, ground, fire, particles)
 * - Spawn and manage the local player character
 * - Handle input for movement and actions
 * - Sync with other players via NetworkManager
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
  private localPlayer: Character | null = null;
  private actionMenu: ActionMenu | null = null;
  private remotePlayers = new Map<string, Character>();
  private network: NetworkManager | null = null;

  constructor() {
    super({ key: SceneKeys.CAMPFIRE });
  }

  create(): void {
    this.user = this.registry.get('user') as User | null;
    this.network = this.registry.get('network') as NetworkManager | null;

    // Enable lighting system for HD-2D effect
    this.setupLighting();

    // Build the scene layers in order
    this.createBackground();
    this.createCampfire();
    this.createLocalPlayer();
    this.createFireflies();
    this.setupInput();
    this.setupMultiplayer();

    console.log('CampfireScene created');
  }

  /**
   * Set up the HD-2D lighting system.
   * Creates warm firelight in the center with cool ambient elsewhere.
   */
  private setupLighting(): void {
    // Enable the lights system
    this.lights.enable();

    // Set ambient light (cool blue, low intensity - the "darkness")
    const ambient = GameConfig.LIGHTING.AMBIENT_COLOR;
    const r = ((ambient >> 16) & 0xff) / 255;
    const g = ((ambient >> 8) & 0xff) / 255;
    const b = (ambient & 0xff) / 255;
    this.lights.setAmbientColor(Phaser.Display.Color.GetColor(r * 255, g * 255, b * 255));
  }

  /**
   * Spawn the local player character.
   * Starts near the campfire.
   */
  private createLocalPlayer(): void {
    const { width, height } = this.cameras.main;
    const groundY = height - GameConfig.WORLD.GROUND_HEIGHT;

    // Spawn position: slightly to the left of the fire
    const spawnX = width / 2 - 80;
    const spawnY = groundY;

    const playerId = this.user?.id ?? 'local';
    // Prefer Playroom profile name (chosen in lobby), fall back to Discord/mock name
    const playerName = this.network?.getLocalPlayerName() ?? this.user?.username ?? 'You';

    this.localPlayer = new Character(this, spawnX, spawnY, playerId, playerName);
  }

  /**
   * Set up input handlers for movement and actions.
   */
  private setupInput(): void {
    // Click/tap handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    // Spacebar to wave (keyboard shortcut)
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.performAction(PlayerActions.WAVING);
    });
  }

  /**
   * Handle click/tap.
   * - Click on self: show action menu
   * - Click elsewhere: move to that position (and close menu if open)
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.localPlayer) return;

    // Check if clicked on self - show action menu
    if (this.localPlayer.containsPoint(pointer.x, pointer.y)) {
      this.showActionMenu();
      return;
    }

    // Close action menu if open
    if (this.actionMenu) {
      this.actionMenu.close();
      this.actionMenu = null;
      return;
    }

    // Otherwise, move to click position
    this.moveLocalPlayer(pointer.x, pointer.y);
  }

  /**
   * Move the local player to a position, constrained to walkable area.
   */
  private moveLocalPlayer(targetX: number, targetY: number): void {
    if (!this.localPlayer) return;

    const { height } = this.cameras.main;
    const groundY = height - GameConfig.WORLD.GROUND_HEIGHT;
    const minY = groundY - 60; // Can't walk too far "up" (into background)
    const maxY = groundY + 20; // Can walk slightly "forward"

    const clampedY = Phaser.Math.Clamp(targetY, minY, maxY);
    this.localPlayer.walkTo(targetX, clampedY);

    // Sync target position to network (other players will interpolate)
    this.network?.setLocalState({ x: targetX, y: clampedY });
  }

  /**
   * Show the action menu above the local player.
   */
  private showActionMenu(): void {
    if (!this.localPlayer || this.localPlayer.isMoving()) return;

    // Close existing menu if any
    if (this.actionMenu) {
      this.actionMenu.close();
    }

    // Convert Emotes to ActionMenu format
    const options = Emotes.map((e) => ({ emoji: e.emoji, action: e.action }));

    // Create menu above player's head
    this.actionMenu = new ActionMenu(
      this,
      this.localPlayer.x,
      this.localPlayer.getHeadY() - 8,
      options,
      (action) => {
        this.performAction(action as PlayerAction);
        this.actionMenu = null;
      }
    );
  }

  /**
   * Perform an action on the local player.
   */
  private performAction(action: PlayerAction): void {
    if (!this.localPlayer || this.localPlayer.isMoving()) return;

    switch (action) {
      case PlayerActions.WAVING:
        this.localPlayer.playWave();
        // Broadcast to other players
        this.network?.setLocalState({ action: PlayerActions.WAVING });
        break;
      // Future actions can be added here
    }
  }

  /**
   * Set up multiplayer - listen for player join/leave events.
   */
  private setupMultiplayer(): void {
    if (!this.network?.isConnected()) {
      console.log('[Scene] Network not connected, skipping multiplayer setup');
      return;
    }

    const localPlayerId = this.network.getLocalPlayerId();
    console.log(`[Scene] Setting up multiplayer, local player: ${localPlayerId}`);

    // Handle players joining
    this.network.onPlayerJoin((playerId, state) => {
      console.log(`[Scene] onPlayerJoin callback: ${playerId}, isLocal: ${playerId === localPlayerId}`);
      // Skip self - we already have local player
      if (playerId === localPlayerId) {
        // But sync our initial position
        if (this.localPlayer) {
          this.network?.setLocalState({
            x: this.localPlayer.x,
            y: this.localPlayer.y,
            action: PlayerActions.IDLE,
          });
        }
        return;
      }

      // Spawn remote player
      this.spawnRemotePlayer(playerId, state);
    });

    // Handle players leaving
    this.network.onPlayerLeave((playerId) => {
      this.removeRemotePlayer(playerId);
    });
  }

  /**
   * Spawn a remote player character.
   */
  private spawnRemotePlayer(playerId: string, state: PlayerState): void {
    if (this.remotePlayers.has(playerId)) return;

    const { width, height } = this.cameras.main;
    const groundY = height - GameConfig.WORLD.GROUND_HEIGHT;

    // Use state position or default spawn
    const x = state.x || width / 2 + 80; // Spawn right of fire
    const y = state.y || groundY;

    const player = new Character(this, x, y, playerId, state.username);
    this.remotePlayers.set(playerId, player);

    console.log(`Remote player joined: ${state.username}`);
  }

  /**
   * Remove a remote player character.
   */
  private removeRemotePlayer(playerId: string): void {
    const player = this.remotePlayers.get(playerId);
    if (player) {
      console.log(`Remote player left: ${playerId}`);
      player.destroy();
      this.remotePlayers.delete(playerId);
    }
  }

  /**
   * Background - painted forest night scene.
   * Uses real HD-2D style painted background image.
   */
  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Try to use real background image, fallback to procedural gradient
    if (this.textures.exists(AssetKeys.BACKGROUND_IMAGE)) {
      const bg = this.add.image(width / 2, height / 2, AssetKeys.BACKGROUND_IMAGE);
      // Scale to fit the screen while maintaining aspect ratio
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);
      // Background should NOT be affected by lighting (painted style)
    } else {
      // Fallback: procedural gradient
      const graphics = this.make.graphics({ x: 0, y: 0 });
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
  }

  private createCampfire(): void {
    const centerX = this.cameras.main.centerX;
    const groundY = this.cameras.main.height - GameConfig.WORLD.GROUND_HEIGHT;
    new Campfire(this, centerX, groundY);
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
      // Real firefly image is 2048x2048 with ~400px visible glow, scale to ~16px
      if (this.textures.exists(AssetKeys.FIREFLY)) {
        firefly.setScale(0.04);
      }
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
    this.updateRemotePlayers();
  }

  /**
   * Update remote player positions and actions from network state.
   * Called every frame to smoothly interpolate movement.
   */
  private updateRemotePlayers(): void {
    if (!this.network?.isConnected()) return;

    for (const [playerId, character] of this.remotePlayers) {
      const state = this.network.getPlayerState(playerId);
      if (!state) continue;

      // Interpolate to target position if not already there
      if (!character.isMoving()) {
        const distance = Phaser.Math.Distance.Between(
          character.x,
          character.y,
          state.x,
          state.y
        );

        // Only move if significant distance (avoid jitter)
        if (distance > 5) {
          character.walkTo(state.x, state.y);
        }
      }

      // Handle remote actions (wave, etc.)
      if (state.action === PlayerActions.WAVING && character.getAction() !== PlayerActions.WAVING) {
        character.playWave();
      }
    }
  }
}
