import {
  insertCoin,
  onPlayerJoin,
  myPlayer,
  isHost,
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

export class NetworkManager {
  private static instance: NetworkManager;
  private initialized = false;
  private players = new Map<string, PlayroomPlayerState>();
  private joinCallbacks: PlayerJoinCallback[] = [];
  private leaveCallbacks: PlayerLeaveCallback[] = [];

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
   * In Discord, this will auto-authenticate users.
   */
  async init(discordMode: boolean = false): Promise<void> {
    if (this.initialized) return;

    try {
      await insertCoin({
        discord: discordMode,
        // Skip lobby for our use case - everyone joins same room
        skipLobby: true,
      });

      this.initialized = true;
      console.log('Playroom initialized, host:', isHost());

      // Set up player join handler
      onPlayerJoin((playerState) => {
        this.handlePlayerJoin(playerState);
      });
    } catch (error) {
      console.error('Failed to initialize Playroom:', error);
      // Don't throw - allow standalone mode
    }
  }

  /**
   * Handle a player joining the room.
   */
  private handlePlayerJoin(playerState: PlayroomPlayerState): void {
    const playerId = playerState.id;
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
}
