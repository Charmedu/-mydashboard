import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/telegram';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

export async function GET(): Promise<NextResponse> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }
  if (!CHAT_ID) {
    return NextResponse.json({ error: 'TELEGRAM_CHAT_ID not set' }, { status: 500 });
  }

  try {
    await sendMessage(
      CHAT_ID,
      `✅ <b>Bot is working!</b>\n\nYour morning briefing will arrive at <b>6:15 AM</b> every day.\n\nReply <code>done 1 2</code> to check off tasks by number, or <code>done all</code> for everything.`
    );
    return NextResponse.json({ ok: true, sentTo: CHAT_ID });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
