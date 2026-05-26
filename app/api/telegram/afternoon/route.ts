import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData, loadUserToken, saveUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { scanGmail } from '@/lib/gmail';
import { format } from 'date-fns';
import type { DashboardData } from '@/lib/types';

const USER_EMAIL = process.env.USER_EMAIL ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function getAccessToken(refreshToken: string): Promise<string | null> {
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
    const d = await res.json() as { access_token?: string };
    return d.access_token ?? null;
  } catch { return null; }
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
    const [data, refreshToken] = await Promise.all([loadUserData(USER_EMAIL), loadUserToken(USER_EMAIL)]);
    if (!data) return NextResponse.json({ error: 'No data' }, { status: 404 });

    const accessToken = refreshToken ? await getAccessToken(refreshToken) : null;
    const gmailResult = accessToken
      ? await scanGmail(accessToken, 9)  // last 9 hours since morning scan
      : { universityEmails: [], billAlerts: [], urgentEmails: [] };

    // Save new university emails
    if (gmailResult.universityEmails.length > 0) {
      const newEmails = gmailResult.universityEmails.map(e => ({
        id: e.id, from: e.from, subject: e.subject, snippet: e.snippet, receivedAt: e.receivedAt,
      }));
      const existing = new Set((data.universityEmails ?? []).map(e => e.id));
      const toAdd = newEmails.filter(e => !existing.has(e.id));
      if (toAdd.length > 0) {
        const updated: DashboardData = {
          ...data,
          universityEmails: [...toAdd, ...(data.universityEmails ?? [])].slice(0, 50),
        };
        await saveUserData(USER_EMAIL, updated);
      }
    }

    const openTasks = data.weekly.tasks.filter(t => !t.done);
    const now = format(new Date(), 'h:mm a');
    const parts: string[] = [];

    parts.push(`☀️ <b>Afternoon Check-in</b> · ${now}`);
    parts.push('');

    if (openTasks.length > 0) {
      parts.push(`📋 <b>Still Open (${openTasks.length})</b>`);
      openTasks.slice(0, 6).forEach((t, i) => {
        const cat = t.category ? ` <i>[${esc(t.category)}]</i>` : '';
        parts.push(`  ${i + 1}. ${esc(t.text)}${cat}`);
      });
    } else {
      parts.push(`✅ All tasks done — you crushed today! 🎉`);
    }

    const allEmails = [...gmailResult.universityEmails, ...gmailResult.urgentEmails];
    if (allEmails.length > 0) {
      parts.push('');
      parts.push(`📧 <b>New Important Emails</b>`);
      allEmails.slice(0, 4).forEach(e => parts.push(`  • ${esc(e.subject)}`));
    }

    if (gmailResult.billAlerts.length > 0) {
      parts.push('');
      parts.push(`💳 <b>Bill Alerts</b>`);
      gmailResult.billAlerts.slice(0, 3).forEach(e => parts.push(`  • ${esc(e.subject)}`));
    }

    parts.push('');
    parts.push(`Keep pushing — you're almost through the day! 💪`);

    await sendMessage(CHAT_ID, parts.join('\n'));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
