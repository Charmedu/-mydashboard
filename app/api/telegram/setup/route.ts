import { NextResponse } from 'next/server';
import { setWebhook, getWebhookInfo } from '@/lib/telegram';

// Force dynamic so Next.js never caches this route at the edge
export const dynamic = 'force-dynamic';

// Hit GET /api/telegram/setup once after deploying to register the webhook.
// Telegram will then POST all bot updates to /api/telegram/webhook.
export async function GET(): Promise<NextResponse> {
  const rawBase = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;
  // VERCEL_URL is hostname-only (no protocol); NEXTAUTH_URL should already have https://
  const base = rawBase && !rawBase.startsWith('http') ? `https://${rawBase}` : rawBase;
  if (!base) {
    return NextResponse.json(
      { error: 'Set NEXTAUTH_URL (or VERCEL_URL) so we know the public URL' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN not set' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const webhookUrl = `${base.replace(/\/$/, '')}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  console.log('[setup] Registering webhook:', webhookUrl, secret ? '(with secret)' : '(no secret)');

  // Fetch current webhook info before re-registering
  const before = await getWebhookInfo();
  console.log('[setup] Current webhook info:', JSON.stringify(before));

  try {
    const result = await setWebhook(webhookUrl, secret);
    console.log('[setup] setWebhook response:', JSON.stringify(result));

    // Fetch updated info to confirm registration
    const after = await getWebhookInfo();
    console.log('[setup] Updated webhook info:', JSON.stringify(after));

    return NextResponse.json(
      { ...result, webhookUrl, before, after },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[setup] Error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
