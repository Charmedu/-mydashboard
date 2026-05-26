import { NextResponse } from 'next/server';
import { setWebhook } from '@/lib/telegram';

// Hit GET /api/telegram/setup once after deploying to register the webhook.
// Telegram will then POST all bot updates to /api/telegram/webhook.
export async function GET(): Promise<NextResponse> {
  const base = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;
  if (!base) {
    return NextResponse.json(
      { error: 'Set NEXTAUTH_URL (or VERCEL_URL) so we know the public URL' },
      { status: 500 }
    );
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }

  const webhookUrl = `${base.replace(/\/$/, '')}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    const result = await setWebhook(webhookUrl, secret);
    return NextResponse.json({ ...result, webhookUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
