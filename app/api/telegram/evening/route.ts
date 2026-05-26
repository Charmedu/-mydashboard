import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { format } from 'date-fns';

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
    if (!data) return NextResponse.json({ error: 'No data' }, { status: 404 });

    const tasks = data.weekly.tasks;
    const done = tasks.filter(t => t.done);
    const open = tasks.filter(t => !t.done);
    const dateStr = format(new Date(), 'EEEE, MMMM d');
    const parts: string[] = [];

    parts.push(`🌙 <b>Evening Wrap-Up</b> · ${dateStr}`);

    if (done.length > 0) {
      parts.push('');
      parts.push(`✅ <b>Completed Today (${done.length})</b>`);
      done.slice(0, 6).forEach(t => parts.push(`  • ${esc(t.text)}`));
    }

    if (open.length > 0) {
      parts.push('');
      parts.push(`📋 <b>Outstanding (${open.length})</b>`);
      open.forEach((t, i) => {
        const cat = t.category ? ` <i>[${esc(t.category)}]</i>` : '';
        const due = t.dueDate ? ` <i>→ ${format(new Date(t.dueDate), 'EEE h:mm a')}</i>` : '';
        parts.push(`  ${i + 1}. ${esc(t.text)}${cat}${due}`);
      });
      parts.push('');
      parts.push(`<i>Want to reschedule? Reply:</i> <code>reschedule 1 tomorrow 10am</code>`);
    } else {
      parts.push('');
      parts.push(`🎉 <b>Everything done!</b> You had a fantastic day.`);
    }

    parts.push('');
    parts.push(`Rest well, Char. Tomorrow is a fresh start. 🌙✨`);

    await sendMessage(CHAT_ID, parts.join('\n'));
    return NextResponse.json({ ok: true, done: done.length, open: open.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
