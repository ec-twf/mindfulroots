// Rasterises public/favicon.svg into the icon sizes Google, iOS and browsers
// actually fetch. Google needs a square raster at a multiple of 48px served
// from a stable URL, and it probes /favicon.ico before anything else — an
// SVG-only favicon is why the SERP shows a globe.
//
// Regenerate with: node scripts/gen-favicons.mjs
// Never rename the outputs. Google caches favicons by URL, so a new filename
// resets the recognition clock.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const SRC = new URL('../public/favicon.svg', import.meta.url);
const OUT = (name) => new URL(`../public/${name}`, import.meta.url);
const BRAND = '#3e5c49';

const svg = await readFile(SRC);

/** Renders the mark at `size`, flattened onto the brand background. */
const render = (size) =>
  sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: BRAND })
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9 })
    .toBuffer();

for (const size of [48, 96, 192]) {
  await writeFile(OUT(`favicon-${size}.png`), await render(size));
}

// iOS composites nothing: a transparent apple-touch-icon renders black.
await writeFile(OUT('apple-touch-icon.png'), await render(180));

// sharp cannot write ICO, so wrap the 48px PNG in the container by hand.
// 6-byte ICONDIR + one 16-byte ICONDIRENTRY, then the PNG payload verbatim —
// PNG-in-ICO is read by every current browser and by Googlebot-Image.
const png48 = await render(48);
const dir = Buffer.alloc(22);
dir.writeUInt16LE(0, 0); // reserved
dir.writeUInt16LE(1, 2); // type: icon
dir.writeUInt16LE(1, 4); // image count
dir.writeUInt8(48, 6); // width
dir.writeUInt8(48, 7); // height
dir.writeUInt8(0, 8); // palette colours (0 = truecolour)
dir.writeUInt8(0, 9); // reserved
dir.writeUInt16LE(1, 10); // colour planes
dir.writeUInt16LE(32, 12); // bits per pixel
dir.writeUInt32LE(png48.length, 14); // payload size
dir.writeUInt32LE(22, 18); // payload offset
await writeFile(OUT('favicon.ico'), Buffer.concat([dir, png48]));

console.log('wrote favicon.ico, favicon-{48,96,192}.png, apple-touch-icon.png');
