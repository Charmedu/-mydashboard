import { NextRequest, NextResponse } from 'next/server';
import { loadUserData, loadUserToken } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { format } from 'date-fns';
import { Task } from '@/lib/types';

const USER_EMAIL = process.env.USER_EMAIL ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface CalEvent {
  time: string;
  title: string;
}

async function getGoogleAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchTodayEvents(accessToken: string): Promise<CalEvent[]> {
  try {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', dayStart);
    url.searchParams.set('timeMax', dayEnd);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '15');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];

    const json = await res.json() as { items?: Array<{ summary?: string; start?: { dateTime?: string; date?: string } }> };
    return (json.items ?? []).map(e => ({
      time: e.start?.dateTime ? format(new Date(e.start.dateTime), 'h:mm a') : 'All day',
      title: e.summary ?? '(No title)',
    }));
  } catch {
    return [];
  }
}

function buildMessage(events: CalEvent[], focus: string, openTasks: Task[]): string {
  const dateStr = format(new Date(), 'EEEE, MMMM d, yyyy');
  const parts: string[] = [];

  parts.push(`🌅 <b>Good morning!</b>`);
  parts.push(`📅 <b>${dateStr}</b>`);

  // Calendar
  parts.push('');
  parts.push('📆 <b>Today\'s Calendar</b>');
  if (events.length > 0) {
    events.forEach(e => parts.push(`  • ${e.time} — ${esc(e.title)}`));
  } else {
    parts.push('  <i>No events today</i>');
  }

  // Weekly focus
  if (focus.trim()) {
    parts.push('');
    parts.push('✍️ <b>Weekly Focus</b>');
    parts.push(`  ${esc(focus.trim())}`);
  }

  // Open tasks
  parts.push('');
  parts.push('📋 <b>Open Tasks This Week</b>');
  if (openTasks.length > 0) {
    openTasks.forEach((t, i) => {
      const cat = t.category ? `  <i>[${esc(t.category)}]</i>` : '';
      parts.push(`  ${i + 1}. ${esc(t.text)}${cat}`);
    });
    parts.push('');
    parts.push('<i>Reply</i> <code>done 1 2</code> <i>to check off by number, or</i> <code>done all</code><i>.</i>');
  } else {
    parts.push('  <i>All tasks complete! 🎉</i>');
  }

  return parts.join('\n');
}

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer {CRON_SECRET} — enforce when configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!USER_EMAIL || !CHAT_ID) {
    return NextResponse.json(
      { error: 'USER_EMAIL and TELEGRAM_CHAT_ID must be set' },
      { status: 500 }
    );
  }

  try {
    const [data, refreshToken] = await Promise.all([
      loadUserData(USER_EMAIL),
      loadUserToken(USER_EMAIL),
    ]);

    if (!data) {
      return NextResponse.json({ error: 'No dashboard data found for USER_EMAIL' }, { status: 404 });
    }

    // Calendar is best-effort — skip gracefully if token unavailable
    let events: CalEvent[] = [];
    if (refreshToken) {
      const accessToken = await getGoogleAccessToken(refreshToken);
      if (accessToken) events = await fetchTodayEvents(accessToken);
    }

    const openTasks = data.weekly.tasks.filter(t => !t.done);
    const message = buildMessage(events, data.weekly.focus ?? '', openTasks);

    await sendMessage(CHAT_ID, message);

    return NextResponse.json({ ok: true, events: events.length, tasks: openTasks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
