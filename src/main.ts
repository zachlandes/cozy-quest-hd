import Phaser from 'phaser';
import { createGameConfig } from './config';
import { DiscordManager } from './managers/DiscordManager';

/**
 * Main entry point for Cozy Quest HD
 *
 * Flow:
 * 1. Initialize Discord SDK (or create mock user in standalone mode)
 * 2. Create Phaser game with config from config.ts
 * 3. Store user in registry so scenes can access it
 */
async function main() {
  console.log('Cozy Quest HD starting...');

  // Initialize Discord SDK (will fall back to mock user in standalone browser mode)
  const discord = DiscordManager.getInstance();
  const user = await discord.init();

  if (user) {
    console.log(`Welcome, ${user.username}!`);
  } else {
    console.log('Running in standalone mode (no Discord)');
  }

  // Create Phaser game - config handles scene registration
  const game = new Phaser.Game(createGameConfig());

  // Store user info in registry for scenes to access
  // Scenes retrieve this via: this.registry.get('user')
  game.registry.set('user', user);

  console.log('Phaser game created');
}

main().catch(console.error);
