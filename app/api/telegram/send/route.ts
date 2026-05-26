import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData, loadUserToken, saveUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { getWeather } from '@/lib/weather';
import { getDailyAffirmation } from '@/lib/ai';
import { scanGmail } from '@/lib/gmail';
import { format, startOfWeek, differenceInDays, parseISO } from 'date-fns';
import type { Habit, DashboardData } from '@/lib/types';

const USER_EMAIL = process.env.USER_EMAIL ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

async function fetchTodayEvents(accessToken: string) {
  try {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', dayStart);
    url.searchParams.set('timeMax', dayEnd);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '10');
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const json = await res.json() as { items?: Array<{ summary?: string; start?: { dateTime?: string; date?: string } }> };
    return (json.items ?? []).map(e => ({
      time: e.start?.dateTime ? format(new Date(e.start.dateTime), 'h:mm a') : 'All day',
      title: e.summary ?? '(No title)',
    }));
  } catch { return []; }
}

// Compute consecutive-day streak for a habit
function getStreak(habit: Habit): number {
  const today = new Date();
  let streak = 0;
  const check = new Date(today);

  for (let i = 0; i < 60; i++) {
    const weekStart = format(startOfWeek(check, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const completions = habit.completions[weekStart];
    const dow = check.getDay(); // 0=Sun
    const idx = dow === 0 ? 6 : dow - 1; // 0=Mon…6=Sun

    if (!completions || !completions[idx]) {
      if (i === 0) { check.setDate(check.getDate() - 1); continue; } // skip today if not done
      break;
    }
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

function getUpcomingExams(data: DashboardData) {
  const today = new Date();
  const results: { name: string; course: string; daysAway: number; date: string }[] = [];
  const examKeywords = /exam|final|midterm|quiz|test/i;

  for (const sem of data.school.semesters) {
    for (const course of sem.courses) {
      for (const asgn of course.assignments) {
        if (asgn.submitted) continue;
        if (!examKeywords.test(asgn.name)) continue;
        try {
          const due = parseISO(asgn.due);
          const days = differenceInDays(due, today);
          if (days >= 0 && days <= 7) {
            results.push({ name: asgn.name, course: course.code || course.name, daysAway: days, date: format(due, 'MMM d') });
          }
        } catch { /* skip invalid dates */ }
      }
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function buildMorningMessage(
  weather: Awaited<ReturnType<typeof getWeather>>,
  events: { time: string; title: string }[],
  data: DashboardData,
  exams: ReturnType<typeof getUpcomingExams>,
  streakAlerts: string[],
  ccAlerts: string[],
  uniEmails: { from: string; subject: string }[],
): string {
  const dateStr = format(new Date(), 'EEEE, MMMM d, yyyy');
  const openTasks = data.weekly.tasks.filter(t => !t.done);
  const parts: string[] = [];

  parts.push(`🌅 <b>Good morning, Char!</b>`);
  parts.push(`📅 <b>${dateStr}</b>`);

  // Weather
  if (weather) {
    parts.push('');
    parts.push(`🌡️ <b>Arlington, TX</b>`);
    parts.push(`${weather.current.emoji} ${weather.current.temp}°F · ${weather.current.description}`);
    if (weather.current.willRain) {
      parts.push(`☂️ <b>Rain alert</b> — ${weather.current.rainChance}% chance today. Bring an umbrella!`);
    }
  }

  // Calendar
  parts.push('');
  parts.push(`📆 <b>Today's Calendar</b>`);
  if (events.length > 0) {
    events.forEach(e => parts.push(`  • ${e.time} — ${esc(e.title)}`));
  } else {
    parts.push('  <i>No events today</i>');
  }

  // Exams
  if (exams.length > 0) {
    parts.push('');
    parts.push(`📚 <b>Upcoming Exams</b>`);
    exams.forEach(e => {
      const urgency = e.daysAway === 0 ? '🚨 TODAY' : e.daysAway === 1 ? '⚠️ tomorrow' : e.daysAway <= 3 ? `⚠️ in ${e.daysAway} days` : `📌 in ${e.daysAway} days`;
      parts.push(`  ${urgency} — ${esc(e.name)} <i>(${esc(e.course)})</i> · ${e.date}`);
    });
  }

  // Tasks
  parts.push('');
  parts.push(`📋 <b>Open Tasks</b> (${openTasks.length})`);
  if (openTasks.length > 0) {
    openTasks.slice(0, 8).forEach((t, i) => {
      const cat = t.category ? ` <i>[${esc(t.category)}]</i>` : '';
      parts.push(`  ${i + 1}. ${esc(t.text)}${cat}`);
    });
    if (openTasks.length > 8) parts.push(`  <i>...and ${openTasks.length - 8} more</i>`);
    parts.push('');
    parts.push('<i>Reply</i> <code>done 1 2</code> <i>or</i> <code>done all</code> <i>to check off.</i>');
  } else {
    parts.push('  <i>All tasks complete! 🎉</i>');
  }

  // Focus
  if (data.weekly.focus?.trim()) {
    parts.push('');
    parts.push(`🎯 <b>Weekly Focus</b>`);
    parts.push(`  ${esc(data.weekly.focus.trim())}`);
  }

  // Streak alerts
  if (streakAlerts.length > 0) {
    parts.push('');
    parts.push(`🔥 <b>Streak Alerts!</b>`);
    streakAlerts.forEach(s => parts.push(`  ${s}`));
  }

  // Credit card alerts
  if (ccAlerts.length > 0) {
    parts.push('');
    ccAlerts.forEach(a => parts.push(`💳 ⚠️ ${esc(a)}`));
  }

  // University emails
  if (uniEmails.length > 0) {
    parts.push('');
    parts.push(`🎓 <b>University Emails</b>`);
    uniEmails.slice(0, 3).forEach(e => parts.push(`  • ${esc(e.subject)}`));
  }

  // Affirmation
  parts.push('');
  parts.push(`💎 <b>Today's Affirmation</b>`);
  parts.push(`  <i>${getDailyAffirmation()}</i>`);

  return parts.join('\n');
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  if (!USER_EMAIL || !CHAT_ID) {
    return NextResponse.json({ error: 'USER_EMAIL and TELEGRAM_CHAT_ID must be set' }, { status: 500 });
  }

  try {
    await initDb();
    const [data, refreshToken] = await Promise.all([
      loadUserData(USER_EMAIL),
      loadUserToken(USER_EMAIL),
    ]);
    if (!data) return NextResponse.json({ error: 'No data found for USER_EMAIL' }, { status: 404 });

    // Parallel: weather + access token
    const [weather, accessToken] = await Promise.all([
      getWeather(),
      refreshToken ? getAccessToken(refreshToken) : Promise.resolve(null),
    ]);

    // Calendar events + Gmail scan (parallel if we have token)
    const [events, gmailResult] = await Promise.all([
      accessToken ? fetchTodayEvents(accessToken) : Promise.resolve([]),
      accessToken ? scanGmail(accessToken, 24) : Promise.resolve({ universityEmails: [], billAlerts: [], urgentEmails: [] }),
    ]);

    // Save university emails to DB
    if (gmailResult.universityEmails.length > 0) {
      const newEmails = gmailResult.universityEmails.map(e => ({
        id: e.id, from: e.from, subject: e.subject,
        snippet: e.snippet, receivedAt: e.receivedAt,
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

    const exams = getUpcomingExams(data);

    // Streak alerts
    const streakAlerts: string[] = [];
    const milestones = [3, 7, 14, 30];
    for (const habit of data.weekly.habits) {
      const streak = getStreak(habit);
      if (milestones.includes(streak)) {
        streakAlerts.push(`${habit.icon} <b>${esc(habit.name)}</b>: ${streak}-day streak! 🎉`);
      }
    }

    // Credit card 80% alerts
    const ccAlerts: string[] = [];
    const currentQ = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const qData = data.quarterly?.[currentQ];
    if (qData) {
      for (const cc of qData.finances.creditCards) {
        if (cc.limit > 0 && cc.balance / cc.limit >= 0.8) {
          const pct = Math.round((cc.balance / cc.limit) * 100);
          ccAlerts.push(`${esc(cc.name)} is at ${pct}% utilization ($${cc.balance.toLocaleString()} / $${cc.limit.toLocaleString()})`);
        }
      }
    }

    const uniEmails = gmailResult.universityEmails.slice(0, 3);
    const msg = buildMorningMessage(weather, events, data, exams, streakAlerts, ccAlerts, uniEmails);
    await sendMessage(CHAT_ID, msg);

    // Mood check-in as separate follow-up
    await sendMessage(
      CHAT_ID,
      `💭 <b>How are you feeling today?</b>\n\nReply with a number:\n1️⃣ Struggling 😞\n2️⃣ Bit rough 😕\n3️⃣ Getting by 😐\n4️⃣ Pretty good 😊\n5️⃣ Amazing! 🤩`
    );

    return NextResponse.json({ ok: true, events: events.length, exams: exams.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
