// Simple script to generate PWA icons
// Run with: node scripts/generate-icons.js
// Requires: sharp package (npm install sharp)

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not found. Installing...');
  console.log('Please run: npm install sharp');
  console.log('Or use the generate-icons.html file in the public folder.');
  process.exit(1);
}

let logoPath = path.join(__dirname, '../public/Logo_2.png');
const outputDir = path.join(__dirname, '../public');

if (!fs.existsSync(logoPath)) {
  console.error('Logo not found at:', logoPath);
  console.log('Please ensure Logo_2.png exists in the public folder.');
  process.exit(1);
} else {
  console.log('Using Logo_2.png');
}

async function generateIcons() {
  try {
    // Get logo metadata
    const metadata = await sharp(logoPath).metadata();
    console.log('Logo dimensions:', metadata.width, 'x', metadata.height);

    // Generate 192x192 icon - use contain with white background, then remove alpha
    await sharp(logoPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 6,
        bottom: 6,
        left: 6,
        right: 6,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({ quality: 100, compressionLevel: 6, palette: false })
      .toFile(path.join(outputDir, 'icon-192x192.png'));

    console.log('✓ Generated icon-192x192.png');

    // Generate 512x512 icon - use contain with white background, then remove alpha
    await sharp(logoPath)
      .resize(480, 480, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .extend({
        top: 16,
        bottom: 16,
        left: 16,
        right: 16,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({ quality: 100, compressionLevel: 6, palette: false })
      .toFile(path.join(outputDir, 'icon-512x512.png'));

    console.log('✓ Generated icon-512x512.png');
    console.log('✓ Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

