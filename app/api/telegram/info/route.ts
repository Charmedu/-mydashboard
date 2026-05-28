import { NextResponse } from 'next/server';
import { getWebhookInfo } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// GET /api/telegram/info — returns current webhook registration without modifying anything.
export async function GET(): Promise<NextResponse> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN not set' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const info = await getWebhookInfo();
  console.log('[info] getWebhookInfo:', JSON.stringify(info));

  return NextResponse.json(info, { headers: { 'Cache-Control': 'no-store' } });
}
