const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

function svgIcon(size, { padding = 0, radius = 0.225, bg = '#4f46e5', text = 'DT' } = {}) {
  const r = Math.round(size * radius);
  const fontSize = Math.round(size * (padding > 0 ? 0.32 : 0.42));
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>` +
    `<text x="50%" y="53%" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" fill="#ffffff" letter-spacing="1">${text}</text>` +
    `</svg>`
  );
}

async function build() {
  // Standard icons (any)
  await sharp(svgIcon(192)).png().toFile(path.join(outDir, 'icon-192.png'));
  await sharp(svgIcon(512)).png().toFile(path.join(outDir, 'icon-512.png'));
  // Maskable: full-bleed square, logo with safe-zone padding (no rounded corners — OS masks it)
  const maskableSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" fill="#4f46e5"/>` +
    `<text x="50%" y="53%" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="170" fill="#ffffff" letter-spacing="2">DT</text>` +
    `</svg>`
  );
  await sharp(maskableSvg).png().toFile(path.join(outDir, 'icon-512-maskable.png'));
  // Apple touch icon
  await sharp(svgIcon(180)).png().toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('Icons generated in', outDir);
  for (const f of fs.readdirSync(outDir)) {
    const st = fs.statSync(path.join(outDir, f));
    console.log(f, st.size + ' bytes');
  }
}

build().catch((e) => { console.error(e); process.exit(1); });
