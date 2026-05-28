import { NextResponse } from 'next/server';
import { setWebhook, getWebhookInfo } from '@/lib/telegram';

// Force dynamic so Next.js never caches this route at the edge
export const dynamic = 'force-dynamic';

const WEBHOOK_URL = 'https://mydashboard-xi-one.vercel.app/api/telegram/webhook';

// Hit GET /api/telegram/setup once after deploying to register the webhook.
// Telegram will then POST all bot updates to /api/telegram/webhook.
export async function GET(): Promise<NextResponse> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN not set' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  console.log('[setup] Registering webhook:', WEBHOOK_URL);

  const before = await getWebhookInfo();
  console.log('[setup] Webhook BEFORE:', JSON.stringify(before));

  try {
    const result = await setWebhook(WEBHOOK_URL);
    console.log('[setup] setWebhook response:', JSON.stringify(result));

    const after = await getWebhookInfo();
    console.log('[setup] Webhook AFTER:', JSON.stringify(after));

    return NextResponse.json(
      { ...result, webhookUrl: WEBHOOK_URL, before, after },
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
