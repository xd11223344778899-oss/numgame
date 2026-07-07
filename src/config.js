import 'dotenv/config';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('المتغير DISCORD_TOKEN غير موجود في ملف .env');
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  prefix: '-',
  maxAttempts: 10,
  minNumber: 1,
  maxNumber: 100,
  answerTimeoutMs: 60_000,
};
