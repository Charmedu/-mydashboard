import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

const USER_EMAIL = process.env.USER_EMAIL ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Week's expenses
    const weekExpenses = (data.expenses ?? []).filter(e => {
      try {
        return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd });
      } catch { return false; }
    });

    // Group by category
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const e of weekExpenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
      total += e.amount;
    }

    const parts: string[] = [];
    parts.push(`💰 <b>Weekly Spending Summary</b>`);
    parts.push(`<i>${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}</i>`);
    parts.push('');

    if (Object.keys(byCategory).length > 0) {
      const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const maxLen = Math.max(...sorted.map(([cat]) => cat.length));
      sorted.forEach(([cat, amt]) => {
        parts.push(`  ${cat.padEnd(maxLen)}  ${fmt(amt)}`);
      });
      parts.push(`  ${'─'.repeat(maxLen + 10)}`);
      parts.push(`  ${'Total'.padEnd(maxLen)}  <b>${fmt(total)}</b>`);
    } else {
      parts.push(`  <i>No expenses logged this week.</i>`);
      parts.push(`  <i>Try: </i><code>spent $25 groceries</code>`);
    }

    // Credit card snapshot
    const currentQ = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    const qData = data.quarterly?.[currentQ];
    if (qData?.finances.creditCards.length) {
      parts.push('');
      parts.push(`💳 <b>Credit Cards</b>`);
      for (const cc of qData.finances.creditCards) {
        if (cc.limit > 0) {
          const pct = Math.round((cc.balance / cc.limit) * 100);
          const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
          const warn = pct >= 80 ? ' ⚠️' : '';
          parts.push(`  ${cc.name}: ${bar} ${pct}%${warn}`);
          parts.push(`    ${fmt(cc.balance)} / ${fmt(cc.limit)}`);
        }
      }
    }

    await sendMessage(CHAT_ID, parts.join('\n'));
    return NextResponse.json({ ok: true, total, categories: Object.keys(byCategory).length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
