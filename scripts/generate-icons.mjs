import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outputDir = join(__dirname, '..', 'public', 'icons');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const svgBuffer = readFileSync(inputSvg);

console.log('Generating PWA icons...');

for (const size of sizes) {
  const outputPath = join(outputDir, `icon-${size}x${size}.png`);
  
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✓ Generated ${size}x${size} icon`);
}

console.log('\n✅ All icons generated successfully!');

