/**
 * Generate placeholder PNG assets for Expo.
 * Run: node scripts/generate-assets.js
 */
const fs = require('fs');
const path = require('path');

function createPNG(width, height, bgColor, text, outputPath) {
  // Minimal 1x1 PNG for placeholder - will be replaced by real assets
  // This creates a valid minimal PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.alloc(4 + 4 + 13 + 4);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdrData.copy(ihdr, 8);
  ihdr.writeInt32BE(ihdrCrc, 21);

  // IDAT chunk - simple uncompressed data for solid color
  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);

  // Create raw image data
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b);
    }
  }
  
  const raw = Buffer.from(rawData);
  
  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw);
  
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idat = Buffer.alloc(4 + 4 + compressed.length + 4);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  idat.writeInt32BE(idatCrc, 8 + compressed.length);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0]);
  iend.writeInt32BE(iendCrc, 8);

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  fs.writeFileSync(outputPath, png);
  console.log(`Created: ${outputPath} (${width}x${height})`);
}

// CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) | 0;
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Generate small placeholder images
createPNG(1024, 1024, '#007AFF', '📚', path.join(assetsDir, 'icon.png'));
createPNG(1024, 1024, '#007AFF', '📚', path.join(assetsDir, 'adaptive-icon.png'));
createPNG(1284, 2778, '#007AFF', '📚', path.join(assetsDir, 'splash.png'));
createPNG(48, 48, '#007AFF', '📚', path.join(assetsDir, 'favicon.png'));

console.log('\nDone! Replace these with proper designed assets.');
