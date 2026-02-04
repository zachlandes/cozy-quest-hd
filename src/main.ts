import Phaser from 'phaser';
import { createGameConfig } from './config';
import { DiscordManager } from './managers/DiscordManager';
import { NetworkManager } from './managers/NetworkManager';

/**
 * Main entry point for Cozy Quest HD
 *
 * Boot sequence:
 * 1. Initialize Discord SDK (or create mock user in standalone mode)
 * 2. Initialize Playroom for multiplayer (optional, graceful fallback)
 * 3. Create Phaser game
 * 4. Store references in registry for scenes to access
 */
async function main() {
  console.log('Cozy Quest HD starting...');

  // Initialize Discord SDK (will fall back to mock user in standalone browser mode)
  const discord = DiscordManager.getInstance();
  const user = await discord.init();
  const isDiscord = discord.isDiscordEnvironment();

  if (user) {
    console.log(`Welcome, ${user.username}!`);
  }

  // Initialize Playroom multiplayer
  // In Discord mode, this auto-authenticates users
  // In standalone mode, this creates a local room for testing
  const network = NetworkManager.getInstance();
  try {
    await network.init(isDiscord);
    console.log('Multiplayer connected');
  } catch (error) {
    console.warn('Multiplayer unavailable, running in single-player mode');
  }

  // Create Phaser game - config handles scene registration
  const game = new Phaser.Game(createGameConfig());

  // Store references in registry for scenes to access
  game.registry.set('user', user);
  game.registry.set('network', network);

  console.log('Phaser game created');
}

main().catch(console.error);
