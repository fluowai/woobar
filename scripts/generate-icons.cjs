/**
 * Gera ícones PWA para Woobar a partir de um ícone base.
 * Cria: favicon.ico (32x32), icon-192.png, icon-512.png
 * O ícone é um design laranja (#f97316) com as iniciais "W" em branco.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const size = 512;
const color = '#f97316';

// Cria um SVG com o ícone Woobar (W estilizado em círculo laranja)
function createIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${color}"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
          font-family="Outfit, sans-serif" font-weight="700"
          font-size="${size * 0.55}" fill="white">W</text>
  </svg>`;
}

async function generateIcons() {
  // Garante que o diretório public existe
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Gera PNGs
  const sizes = [192, 512];
  for (const s of sizes) {
    const svg = createIconSVG(s);
    const outPath = path.join(publicDir, `icon-${s}.png`);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outPath);
    console.log(`✓ Gerado: icon-${s}.png`);
  }

  // Gera favicon.ico (32x32)
  const faviconSvg = createIconSVG(32);
  const faviconPng = await sharp(Buffer.from(faviconSvg))
    .png()
    .toBuffer();

  // Cria ICO (32x32) - sharp suporta writeToBuffer para ico
  await sharp(faviconPng)
    .resize(32, 32)
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ Gerado: favicon.ico');

  // Gera apple-touch-icon (180x180)
  const appleSvg = createIconSVG(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Gerado: apple-touch-icon.png');

  // Gera screenshots placeholders (opcional)
  // Estes devem ser substituídos por screenshots reais
  const screenshotSvg = createIconSVG(750);
  await sharp(Buffer.from(screenshotSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));
  console.log('✓ Gerado: screenshot-mobile.png (placeholder)');

  const screenshotWideSvg = createIconSVG(1280);
  await sharp(Buffer.from(screenshotWideSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-wide.png'));
  console.log('✓ Gerado: screenshot-wide.png (placeholder)');

  console.log('\n✅ Ícones gerados com sucesso em public/');
}

generateIcons().catch(err => {
  console.error('Erro ao gerar ícones:', err);
  process.exit(1);
});