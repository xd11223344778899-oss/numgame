import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import reshaper from 'arabic-persian-reshaper';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, '../../assets/fonts');

const boldFont = join(fontsDir, 'NotoSansArabic-Bold.ttf');
const regularFont = join(fontsDir, 'NotoSansArabic-Regular.ttf');

if (!existsSync(boldFont) || !existsSync(regularFont)) {
  throw new Error('ملفات الخطوط غير موجودة في assets/fonts');
}

GlobalFonts.registerFromPath(boldFont, 'NotoArabicBold');
GlobalFonts.registerFromPath(regularFont, 'NotoArabic');

function shape(text) {
  return reshaper.ArabicShaper.convertArabic(text);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBanner() {
  const width = 520;
  const height = 220;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px NotoArabicBold';
  ctx.fillText(shape('تخمين'), width / 2, 52);

  const boxWidth = 420;
  const boxHeight = 52;
  const boxX = (width - boxWidth) / 2;
  const boxY = 88;

  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 26);
  ctx.fillStyle = 'rgba(28, 28, 36, 0.92)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(120, 90, 220, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const glow = ctx.createLinearGradient(boxX, boxY + boxHeight - 8, boxX, boxY + boxHeight);
  glow.addColorStop(0, 'rgba(120, 90, 220, 0)');
  glow.addColorStop(1, 'rgba(140, 110, 255, 0.45)');
  ctx.fillStyle = glow;
  roundRect(ctx, boxX, boxY + boxHeight - 10, boxWidth, 10, 0);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px NotoArabic';
  ctx.fillText(shape('وأختار 1-100'), width / 2, boxY + boxHeight / 2);

  ctx.font = '20px NotoArabic';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillText(shape('وعندك عشره محاولات'), width / 2, 168);

  return canvas.toBuffer('image/png');
}

let cachedBanner = null;

export function getBannerBuffer() {
  if (!cachedBanner) {
    cachedBanner = drawBanner();
  }
  return cachedBanner;
}

export function preloadBanner() {
  getBannerBuffer();
}
