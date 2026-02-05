import Phaser from 'phaser';
import { createGameConfig } from './config';
import { DiscordManager } from './managers/DiscordManager';
import { NetworkManager } from './managers/NetworkManager';

/**
 * Main entry point for Cozy Quest HD
 *
 * Boot sequence:
 * 1. Detect environment (Discord iframe vs standalone browser)
 * 2. Initialize Playroom (handles Discord SDK internally when discord: true)
 * 3. Create Phaser game
 * 4. Store references in registry for scenes to access
 */
async function main() {
  console.log('Cozy Quest HD starting...');

  // Detect if running inside Discord Activity iframe
  const discord = DiscordManager.getInstance();
  const user = await discord.init();
  const isDiscord = discord.isDiscordEnvironment();

  console.log(`Environment: ${isDiscord ? 'Discord Activity' : 'Standalone browser'}`);

  if (user) {
    console.log(`Welcome, ${user.username}!`);
  }

  // Initialize Playroom multiplayer
  // In Discord mode, Playroom handles the Discord SDK lifecycle (ready, auth, etc.)
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
