import type { User } from '@/types';

/**
 * DiscordManager - Tracks user identity
 *
 * Discord SDK is handled entirely by Playroom (via insertCoin({ discord: true })).
 * We do NOT import @discord/embedded-app-sdk — Playroom manages the SDK lifecycle,
 * ready() call, and auth internally. Using our own DiscordSDK instance would
 * conflict with Playroom's and cause a grey/blank screen.
 *
 * This manager just provides a mock user for standalone browser testing.
 * In Discord mode, user identity comes from Playroom's player profiles.
 */
export class DiscordManager {
  private static instance: DiscordManager;
  private user: User | null = null;

  private constructor() {}

  static getInstance(): DiscordManager {
    if (!DiscordManager.instance) {
      DiscordManager.instance = new DiscordManager();
    }
    return DiscordManager.instance;
  }

  async init(): Promise<User | null> {
    // Create a temporary user for the boot sequence.
    // The real username comes from Playroom's player profiles
    // once insertCoin() completes and players join.
    return this.createMockUser();
  }

  private createMockUser(): User {
    const mockId = `mock-${Date.now()}`;
    this.user = {
      id: mockId,
      username: `Player${Math.floor(Math.random() * 1000)}`,
    };
    return this.user;
  }

  getUser(): User | null {
    return this.user;
  }

  /**
   * Detect if we're running inside a Discord Activity iframe.
   * Check for Discord's frame_id query param or nested iframe context.
   */
  isDiscordEnvironment(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.has('frame_id') || params.has('instance_id');
  }
}
