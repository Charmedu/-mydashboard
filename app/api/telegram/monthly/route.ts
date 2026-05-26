import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

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

    // Last month's data
    const now = new Date();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStart = startOfMonth(lastMonthEnd);
    const monthName = format(lastMonthStart, 'MMMM yyyy');

    const interval = { start: lastMonthStart, end: endOfMonth(lastMonthEnd) };

    const monthJournal = (data.journal ?? []).filter(e => {
      try { return isWithinInterval(parseISO(e.timestamp), interval); } catch { return false; }
    });

    const monthMood = (data.mood ?? []).filter(e => {
      try { return isWithinInterval(parseISO(e.date), interval); } catch { return false; }
    });

    const avgMood = monthMood.length > 0
      ? (monthMood.reduce((s, m) => s + m.score, 0) / monthMood.length).toFixed(1)
      : null;

    const bestDay = monthMood.length > 0
      ? monthMood.reduce((best, m) => m.score > best.score ? m : best)
      : null;

    const monthExpenses = (data.expenses ?? []).filter(e => {
      try { return isWithinInterval(parseISO(e.date), interval); } catch { return false; }
    });
    const totalSpend = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const parts: string[] = [];
    parts.push(`📖 <b>Monthly Summary — ${monthName}</b>`);
    parts.push('');

    // Journal
    parts.push(`📝 <b>Journal</b>`);
    parts.push(`  ${monthJournal.length} entr${monthJournal.length === 1 ? 'y' : 'ies'} written`);
    if (monthJournal.length > 0) {
      const recent = monthJournal.slice(-2);
      recent.forEach(e => {
        const d = format(parseISO(e.timestamp), 'MMM d');
        const preview = esc(e.text.slice(0, 60)) + (e.text.length > 60 ? '…' : '');
        parts.push(`  • <i>${d}: "${preview}"</i>`);
      });
    }

    // Mood
    parts.push('');
    parts.push(`😊 <b>Mood</b>`);
    if (avgMood) {
      const moodEmoji = parseFloat(avgMood) >= 4 ? '😊' : parseFloat(avgMood) >= 3 ? '😐' : '😔';
      parts.push(`  Average: <b>${avgMood}/5</b> ${moodEmoji}`);
      if (bestDay) parts.push(`  Best day: ${format(parseISO(bestDay.date), 'MMM d')} (score: ${bestDay.score})`);
    } else {
      parts.push('  <i>No mood data this month</i>');
    }

    // Spending
    if (totalSpend > 0) {
      parts.push('');
      parts.push(`💰 <b>Spending</b>`);
      parts.push(`  Total: <b>$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>`);
    }

    parts.push('');
    parts.push(`Keep growing, Char. Every month you get stronger. 🌱`);

    await sendMessage(CHAT_ID, parts.join('\n'));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
