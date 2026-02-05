/**
 * Remove checkered transparency pattern from AI-generated images
 * and replace with actual alpha transparency.
 *
 * Usage: node scripts/fix-transparency.js
 */

import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const SPRITES_DIR = './public/assets/sprites';

// Checkered pattern colors (light gray and dark gray)
const CHECKER_LIGHT = { r: 204, g: 204, b: 204 }; // #CCCCCC
const CHECKER_DARK = { r: 153, g: 153, b: 153 };  // #999999

// Tolerance for color matching
const TOLERANCE = 15;

function isCheckerColor(r, g, b) {
  const matchesLight =
    Math.abs(r - CHECKER_LIGHT.r) <= TOLERANCE &&
    Math.abs(g - CHECKER_LIGHT.g) <= TOLERANCE &&
    Math.abs(b - CHECKER_LIGHT.b) <= TOLERANCE;

  const matchesDark =
    Math.abs(r - CHECKER_DARK.r) <= TOLERANCE &&
    Math.abs(g - CHECKER_DARK.g) <= TOLERANCE &&
    Math.abs(b - CHECKER_DARK.b) <= TOLERANCE;

  return matchesLight || matchesDark;
}

async function fixTransparency(inputPath, outputPath) {
  const image = sharp(inputPath);
  const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Processing ${inputPath}: ${width}x${height}, ${channels} channels`);

  // Process each pixel
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isCheckerColor(r, g, b)) {
      // Make this pixel transparent
      data[i + 3] = 0; // Set alpha to 0
    }
  }

  // Save the fixed image
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log(`  -> Saved to ${outputPath}`);
}

async function main() {
  const files = await readdir(SPRITES_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  for (const file of pngFiles) {
    const inputPath = join(SPRITES_DIR, file);
    const outputPath = join(SPRITES_DIR, file.replace('.png', '-fixed.png'));

    try {
      await fixTransparency(inputPath, outputPath);
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }

  console.log('\nDone! Review the -fixed.png files, then rename them to replace originals.');
}

main();
