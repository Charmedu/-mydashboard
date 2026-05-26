import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData, saveUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';

const USER_EMAIL = process.env.USER_EMAIL ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!USER_EMAIL || !CHAT_ID) {
    return NextResponse.json({ error: 'USER_EMAIL and TELEGRAM_CHAT_ID must be set' }, { status: 500 });
  }

  try {
    await initDb();
    const data = await loadUserData(USER_EMAIL);
    if (!data) return NextResponse.json({ ok: true, sent: 0 });

    const now = new Date();
    const pending = (data.reminders ?? []).filter(r => !r.sent && new Date(r.dueAt) <= now);

    if (pending.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    for (const r of pending) {
      await sendMessage(CHAT_ID, `⏰ <b>Reminder:</b> ${esc(r.text)}`);
    }

    const sentIds = new Set(pending.map(r => r.id));
    const updated = {
      ...data,
      reminders: (data.reminders ?? []).map(r => sentIds.has(r.id) ? { ...r, sent: true } : r),
    };
    await saveUserData(USER_EMAIL, updated);

    return NextResponse.json({ ok: true, sent: pending.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
