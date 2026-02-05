import {
  insertCoin,
  onPlayerJoin,
  myPlayer,
  isHost,
  RPC,
  type PlayerState as PlayroomPlayerState,
} from 'playroomkit';
import type { PlayerState, PlayerAction } from '@/types';
import { PlayerActions } from '@/types';

/**
 * NetworkManager - Handles Playroom multiplayer state sync
 *
 * Responsibilities:
 * - Initialize Playroom connection (with Discord mode if available)
 * - Track all connected players
 * - Sync local player state to network
 * - Receive and expose remote player states
 * - Emit events when players join/leave
 *
 * Usage:
 * 1. Call init() before Phaser boots
 * 2. In scene create(), call onPlayerJoin() to get existing + new players
 * 3. Call setLocalState() when local player moves/acts
 * 4. Read remote player states in update loop
 */

type PlayerJoinCallback = (playerId: string, state: PlayerState) => void;
type PlayerLeaveCallback = (playerId: string) => void;
type ActionCallback = (playerId: string, action: PlayerAction) => void;

export class NetworkManager {
  private static instance: NetworkManager;
  private initialized = false;
  private players = new Map<string, PlayroomPlayerState>();
  private joinCallbacks: PlayerJoinCallback[] = [];
  private leaveCallbacks: PlayerLeaveCallback[] = [];
  private actionCallbacks: ActionCallback[] = [];

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  /**
   * Initialize Playroom connection.
   * Must be called before Phaser game boots.
   *
   * Requirements:
   * - For local testing: Playroom mocks auth automatically
   * - For Discord production: Need VITE_PLAYROOM_GAME_ID from Playroom portal
   *   and link Discord app in Playroom's "Discord Activity" settings
   */
  async init(discordMode: boolean = false): Promise<void> {
    if (this.initialized) return;

    const gameId = import.meta.env.VITE_PLAYROOM_GAME_ID;

    // For local testing, Playroom will mock even without gameId
    // For production, gameId is required
    if (!gameId && discordMode) {
      console.warn('VITE_PLAYROOM_GAME_ID not set - multiplayer may not work in Discord');
    }

    try {
      // For local development, use a shared room code so all browser instances join the same room
      // In Discord, Playroom auto-assigns rooms based on the voice channel
      // Playroom uses hash (#r=CODE) not query string (?r=CODE)
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const roomCode = hashParams.get('r') || 'dev-room';

      await insertCoin({
        gameId: gameId || undefined,
        discord: discordMode,
        // Show Playroom lobby for local browser testing (shareable room link)
        // Skip lobby in Discord (auto-groups by voice channel)
        skipLobby: discordMode,
        // Room code only matters for non-Discord mode
        roomCode: discordMode ? undefined : roomCode,
      });

      this.initialized = true;
      console.log(`Playroom initialized, host: ${isHost()}, room: ${roomCode}`);

      // Register RPC handler for actions (wave, etc.)
      RPC.register('action', async (data: { action: PlayerAction }, caller) => {
        for (const callback of this.actionCallbacks) {
          callback(caller.id, data.action);
        }
      });

      // Set up player join handler - called for each player including self
      onPlayerJoin((playerState) => {
        this.handlePlayerJoin(playerState);
      });
    } catch (error) {
      console.error('Failed to initialize Playroom:', error);
      // Don't throw - allow single-player fallback mode
    }
  }

  /**
   * Handle a player joining the room.
   */
  private handlePlayerJoin(playerState: PlayroomPlayerState): void {
    const playerId = playerState.id;
    console.log(`[Network] Player joined: ${playerId}, total players: ${this.players.size + 1}`);
    this.players.set(playerId, playerState);

    // Get initial state or create default
    const profile = playerState.getProfile();
    const state = this.getPlayerState(playerId) ?? {
      id: playerId,
      username: profile.name ?? `Player${playerId.slice(0, 4)}`,
      x: 0,
      y: 0,
      action: PlayerActions.IDLE,
      actionTime: Date.now(),
    };

    // Notify listeners
    for (const callback of this.joinCallbacks) {
      callback(playerId, state);
    }

    // Set up quit handler
    playerState.onQuit(() => {
      this.players.delete(playerId);
      for (const callback of this.leaveCallbacks) {
        callback(playerId);
      }
    });
  }

  /**
   * Register callback for when players join.
   * Called immediately for existing players, then for new ones.
   */
  onPlayerJoin(callback: PlayerJoinCallback): void {
    this.joinCallbacks.push(callback);

    // Replay existing players to this callback
    // This handles the timing issue where Playroom fires join events
    // before the scene registers its callbacks
    for (const playerId of this.players.keys()) {
      const state = this.getPlayerState(playerId);
      if (state) {
        callback(playerId, state);
      }
    }
  }

  /**
   * Register callback for when players leave.
   */
  onPlayerLeave(callback: PlayerLeaveCallback): void {
    this.leaveCallbacks.push(callback);
  }

  /**
   * Update the local player's state.
   * This broadcasts to all other players.
   */
  setLocalState(state: Partial<PlayerState>): void {
    const player = myPlayer();
    if (!player) return;

    if (state.x !== undefined && state.y !== undefined) {
      player.setState('pos', { x: state.x, y: state.y });
    }
    if (state.action !== undefined) {
      player.setState('action', state.action);
      player.setState('actionTime', Date.now());
    }
  }

  /**
   * Get a player's current state.
   */
  getPlayerState(playerId: string): PlayerState | null {
    const playerState = this.players.get(playerId);
    if (!playerState) return null;

    const profile = playerState.getProfile();
    const pos = playerState.getState('pos') as { x: number; y: number } | undefined;
    const action = (playerState.getState('action') as PlayerAction) ?? PlayerActions.IDLE;
    const actionTime = (playerState.getState('actionTime') as number) ?? Date.now();

    return {
      id: playerId,
      username: profile.name ?? `Player${playerId.slice(0, 4)}`,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      action,
      actionTime,
    };
  }

  /**
   * Get all current player states.
   */
  getAllPlayerStates(): PlayerState[] {
    const states: PlayerState[] = [];
    for (const playerId of this.players.keys()) {
      const state = this.getPlayerState(playerId);
      if (state) states.push(state);
    }
    return states;
  }

  /**
   * Get the local player's ID.
   */
  getLocalPlayerId(): string | null {
    return myPlayer()?.id ?? null;
  }

  /**
   * Get the local player's profile name from Playroom.
   * This is the name chosen in the lobby.
   */
  getLocalPlayerName(): string | null {
    return myPlayer()?.getProfile()?.name ?? null;
  }

  /**
   * Check if we're the host (for any host-only logic).
   */
  isHost(): boolean {
    return isHost();
  }

  /**
   * Check if connected to Playroom.
   */
  isConnected(): boolean {
    return this.initialized;
  }

  /**
   * Broadcast an action to all other players via RPC.
   * Use this for discrete events like emotes that don't need state tracking.
   */
  broadcastAction(action: PlayerAction): void {
    if (!this.initialized) return;
    RPC.call('action', { action }, RPC.Mode.OTHERS);
  }

  /**
   * Register callback for when remote players perform actions.
   */
  onRemoteAction(callback: ActionCallback): void {
    this.actionCallbacks.push(callback);
  }
}
