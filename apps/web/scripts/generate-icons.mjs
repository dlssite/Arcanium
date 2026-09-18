#!/usr/bin/env node
/**
 * Generate all required PWA icon sizes from the source arcanium.png
 *
 * Outputs:
 *   - icon-192.png (192×192 for Android)
 *   - icon-512.png (512×512 for Android)
 *   - icon-maskable-512.png (512×512 with 10% safe-zone padding for Adaptive Icons)
 *   - apple-touch-icon.png (180×180 for iOS home screen)
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const sourceIcon = join(publicDir, 'arcanium.png');

const sizes = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from arcanium.png...\n');

  for (const { name, size, maskable } of sizes) {
    const outputPath = join(publicDir, name);

    try {
      if (maskable) {
        // Maskable icons need 10% safe-zone padding (80% of the icon is safe area)
        // We shrink the original to 80% and center it on a solid background
        const safeSize = Math.round(size * 0.8);
        const padding = Math.round((size - safeSize) / 2);

        await sharp(sourceIcon)
          .resize(safeSize, safeSize, { fit: 'contain', background: { r: 18, g: 14, b: 24, alpha: 1 } })
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 18, g: 14, b: 24, alpha: 1 }, // #120E18 brand dark bg
          })
          .png({ quality: 95, compressionLevel: 9 })
          .toFile(outputPath);

        console.log(`✅ ${name} (${size}×${size}, maskable with 10% safe-zone)`);
      } else {
        // Standard icons — just resize
        await sharp(sourceIcon)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ quality: 95, compressionLevel: 9 })
          .toFile(outputPath);

        console.log(`✅ ${name} (${size}×${size})`);
      }
    } catch (err) {
      console.error(`❌ Failed to generate ${name}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n✨ All icons generated successfully!');
}

generateIcons();
