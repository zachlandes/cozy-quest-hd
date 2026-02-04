import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { User } from '@/types';

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';

export class DiscordManager {
  private static instance: DiscordManager;
  private sdk: DiscordSDK | null = null;
  private user: User | null = null;

  private constructor() {}

  static getInstance(): DiscordManager {
    if (!DiscordManager.instance) {
      DiscordManager.instance = new DiscordManager();
    }
    return DiscordManager.instance;
  }

  async init(): Promise<User | null> {
    // Skip Discord SDK if no client ID (standalone browser mode)
    if (!CLIENT_ID) {
      console.log('No Discord Client ID, running in standalone mode');
      return this.createMockUser();
    }

    try {
      this.sdk = new DiscordSDK(CLIENT_ID);
      await this.sdk.ready();

      // Authorize with Discord
      const { code } = await this.sdk.commands.authorize({
        client_id: CLIENT_ID,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: ['identify'],
      });

      // In a real app, exchange code for token via backend
      // For now, we'll use the SDK's built-in auth
      const auth = await this.sdk.commands.authenticate({ access_token: code });

      if (auth?.user) {
        this.user = {
          id: auth.user.id,
          username: auth.user.username,
          avatar: auth.user.avatar ?? undefined,
        };
      }

      return this.user;
    } catch (error) {
      console.warn('Discord SDK initialization failed, falling back to standalone mode:', error);
      return this.createMockUser();
    }
  }

  private createMockUser(): User {
    // Generate a mock user for standalone testing
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

  isDiscordEnvironment(): boolean {
    return this.sdk !== null;
  }
}
