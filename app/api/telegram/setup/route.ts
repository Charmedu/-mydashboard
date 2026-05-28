import { NextResponse } from 'next/server';
import { setWebhook, getWebhookInfo } from '@/lib/telegram';

// Force dynamic so Next.js never caches this route at the edge
export const dynamic = 'force-dynamic';

// Priority order for resolving the public base URL:
//   1. NEXTAUTH_URL          — explicitly set production URL (most reliable)
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel sets this to the production domain (not preview)
//   3. VERCEL_URL            — deployment-specific URL, may be a preview URL (last resort)
function resolveBase(): string | null {
  const candidates = [
    { key: 'NEXTAUTH_URL', value: process.env.NEXTAUTH_URL },
    { key: 'VERCEL_PROJECT_PRODUCTION_URL', value: process.env.VERCEL_PROJECT_PRODUCTION_URL },
    { key: 'VERCEL_URL', value: process.env.VERCEL_URL },
  ];

  for (const { key, value } of candidates) {
    if (!value) continue;
    const base = value.startsWith('http') ? value : `https://${value}`;
    console.log(`[setup] Using base URL from ${key}: ${base}`);
    return base.replace(/\/$/, '');
  }
  return null;
}

// Hit GET /api/telegram/setup once after deploying to register the webhook.
// Telegram will then POST all bot updates to /api/telegram/webhook.
export async function GET(): Promise<NextResponse> {
  const base = resolveBase();

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

  const webhookUrl = `${base}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  console.log('[setup] Target webhook URL:', webhookUrl);
  console.log('[setup] Secret token set:', !!secret);

  // Fetch current webhook info before re-registering
  const before = await getWebhookInfo();
  console.log('[setup] Webhook BEFORE registration:', JSON.stringify(before));

  try {
    const result = await setWebhook(webhookUrl, secret);
    console.log('[setup] setWebhook raw response:', JSON.stringify(result));

    // Fetch updated info to confirm Telegram accepted the URL
    const after = await getWebhookInfo();
    console.log('[setup] Webhook AFTER registration:', JSON.stringify(after));

    return NextResponse.json(
      { ...result, webhookUrl, before, after },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[setup] Error registering webhook:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
