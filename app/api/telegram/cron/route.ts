import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData, loadUserToken, saveUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';
import { getWeather, reverseGeocode } from '@/lib/weather';
import { getDailyAffirmation } from '@/lib/ai';
import { scanGmail } from '@/lib/gmail';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, parseISO, differenceInDays,
} from 'date-fns';
import type { Habit, DashboardData } from '@/lib/types';

const USER_EMAIL = process.env.USER_EMAIL ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';
const DEFAULT_LAT = 32.7357;
const DEFAULT_LON = -97.1081;
const DEFAULT_LOCATION = 'Arlington, TX';
const LOCATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const REFLECTION_PROMPTS = [
  ['What are you most proud of this week?', "What's one thing you'd do differently?", "What are you looking forward to next week?"],
  ['What challenged you most this week, and what did you learn?', 'Who made a positive impact on your week?', 'What small win deserves more celebration?'],
  ["What drained your energy this week?", 'What recharged you?', "What's one habit you want to strengthen next week?"],
  ['What surprised you this week?', 'Where did you show up for yourself?', 'What do you want to release before the new week begins?'],
];

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getChicagoTime(): { hour: number; dayOfWeek: number; dayOfMonth: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    hour12: false,
    weekday: 'long',
    day: 'numeric',
  }).formatToParts(now);

  let hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  if (hour === 24) hour = 0;

  const dayOfMonth = parseInt(parts.find(p => p.type === 'day')?.value ?? '1');
  const weekdayName = parts.find(p => p.type === 'weekday')?.value ?? '';
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = Math.max(0, DAYS.indexOf(weekdayName));

  return { hour, dayOfWeek, dayOfMonth };
}

function chicagoDateString(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date());
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
    const json = await res.json() as { items?: Array<{ summary?: string; start?: { dateTime?: string } }> };
    return (json.items ?? []).map(e => ({
      time: e.start?.dateTime ? format(new Date(e.start.dateTime), 'h:mm a') : 'All day',
      title: e.summary ?? '(No title)',
    }));
  } catch { return []; }
}

function getStreak(habit: Habit): number {
  const today = new Date();
  let streak = 0;
  const check = new Date(today);
  for (let i = 0; i < 60; i++) {
    const weekStart = format(startOfWeek(check, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const completions = habit.completions[weekStart];
    const dow = check.getDay();
    const idx = dow === 0 ? 6 : dow - 1;
    if (!completions || !completions[idx]) {
      if (i === 0) { check.setDate(check.getDate() - 1); continue; }
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
        } catch { /* skip */ }
      }
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function getUpcomingAssignments(data: DashboardData) {
  const today = new Date();
  const examKeywords = /exam|final|midterm|quiz|test/i;
  const results: { name: string; course: string; daysAway: number; date: string }[] = [];
  for (const sem of data.school.semesters) {
    for (const course of sem.courses) {
      for (const asgn of course.assignments) {
        if (asgn.submitted) continue;
        if (examKeywords.test(asgn.name)) continue; // already shown in exams section
        try {
          const due = parseISO(asgn.due);
          const days = differenceInDays(due, today);
          if (days >= 0 && days <= 3) {
            results.push({ name: asgn.name, course: course.code || course.name, daysAway: days, date: format(due, 'MMM d') });
          }
        } catch { /* skip */ }
      }
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

function isFinalWeek(data: DashboardData): boolean {
  const today = new Date();
  let count = 0;
  for (const sem of data.school.semesters) {
    for (const course of sem.courses) {
      for (const asgn of course.assignments) {
        if (asgn.submitted) continue;
        try {
          const days = differenceInDays(parseISO(asgn.due), today);
          if (days >= 0 && days <= 7) count++;
        } catch { /* skip */ }
      }
    }
  }
  return count >= 3;
}

async function checkReminders(data: DashboardData): Promise<DashboardData> {
  const now = new Date();
  const pending = (data.reminders ?? []).filter(r => !r.sent && new Date(r.dueAt) <= now);
  if (pending.length === 0) return data;

  for (const r of pending) {
    await sendMessage(CHAT_ID, `⏰ <b>Reminder:</b> ${esc(r.text)}`);
  }

  const sentIds = new Set(pending.map(r => r.id));
  const updated: DashboardData = {
    ...data,
    reminders: (data.reminders ?? []).map(r => sentIds.has(r.id) ? { ...r, sent: true } : r),
  };
  await saveUserData(USER_EMAIL, updated);
  return updated;
}

async function sendMorningBriefing(data: DashboardData, refreshToken: string | null): Promise<void> {
  // Determine weather location: use stored Telegram location if recent, else default
  let lat = DEFAULT_LAT, lon = DEFAULT_LON, locationName = DEFAULT_LOCATION;
  if (data.lastLocation) {
    const age = Date.now() - new Date(data.lastLocation.timestamp).getTime();
    if (age < LOCATION_MAX_AGE_MS) {
      lat = data.lastLocation.lat;
      lon = data.lastLocation.lng;
      locationName = (await reverseGeocode(lat, lon)) ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
  }

  const accessToken = refreshToken ? await getAccessToken(refreshToken) : null;

  const [weather, events, gmailResult] = await Promise.all([
    getWeather(lat, lon),
    accessToken ? fetchTodayEvents(accessToken) : Promise.resolve([]),
    accessToken ? scanGmail(accessToken, 24) : Promise.resolve({ universityEmails: [], billAlerts: [], urgentEmails: [] }),
  ]);

  // Save new university emails to DB
  if (gmailResult.universityEmails.length > 0) {
    const newEmails = gmailResult.universityEmails.map(e => ({
      id: e.id, from: e.from, subject: e.subject, snippet: e.snippet, receivedAt: e.receivedAt,
    }));
    const existing = new Set((data.universityEmails ?? []).map(e => e.id));
    const toAdd = newEmails.filter(e => !existing.has(e.id));
    if (toAdd.length > 0) {
      await saveUserData(USER_EMAIL, {
        ...data,
        universityEmails: [...toAdd, ...(data.universityEmails ?? [])].slice(0, 50),
      });
    }
  }

  const exams = getUpcomingExams(data);
  const assignments = getUpcomingAssignments(data);
  const finalWeek = isFinalWeek(data);
  const openTasks = data.weekly.tasks.filter(t => !t.done);

  const streakAlerts: string[] = [];
  for (const habit of data.weekly.habits) {
    const streak = getStreak(habit);
    if ([3, 7, 14, 30].includes(streak)) {
      streakAlerts.push(`${habit.icon} <b>${esc(habit.name)}</b>: ${streak}-day streak! 🎉`);
    }
  }

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

  const parts: string[] = [];
  parts.push(`🌅 <b>Good morning, Char!</b>`);
  parts.push(`📅 <b>${chicagoDateString()}</b>`);

  // Weather
  if (weather) {
    parts.push('');
    parts.push(`🌡️ <b>${esc(locationName)}</b>`);
    parts.push(`${weather.current.emoji} ${weather.current.temp}°F · ${weather.current.description}`);
    if (weather.current.willRain) {
      parts.push(`☂️ <b>Rain today</b> — ${weather.current.rainChance}% chance. Bring an umbrella!`);
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
    parts.push(`📚 <b>Upcoming Exams / Quizzes</b>`);
    exams.forEach(e => {
      const urgency = e.daysAway === 0 ? '🚨 TODAY' : e.daysAway === 1 ? '⚠️ tomorrow' : `📌 in ${e.daysAway} days`;
      parts.push(`  ${urgency} — ${esc(e.name)} <i>(${esc(e.course)})</i> · ${e.date}`);
    });
  }

  // Assignments due soon
  if (assignments.length > 0) {
    parts.push('');
    parts.push(`📝 <b>Assignments Due Soon</b>`);
    assignments.forEach(a => {
      const urgency = a.daysAway === 0 ? '🔴 Today' : a.daysAway === 1 ? '🟠 Tomorrow' : `🟡 in ${a.daysAway} days`;
      parts.push(`  ${urgency} — ${esc(a.name)} <i>(${esc(a.course)})</i>`);
    });
  }

  // Finals week encouragement
  if (finalWeek) {
    parts.push('');
    parts.push(`🎓 <b>Finals Week!</b>`);
    parts.push(`You've prepared for this, Char. Take it one step at a time. You've got this! 💪`);
  }

  // Open tasks
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

  // CC alerts
  if (ccAlerts.length > 0) {
    parts.push('');
    ccAlerts.forEach(a => parts.push(`💳 ⚠️ ${esc(a)}`));
  }

  // University emails
  const uniEmails = gmailResult.universityEmails.slice(0, 3);
  if (uniEmails.length > 0) {
    parts.push('');
    parts.push(`🎓 <b>University Emails</b>`);
    uniEmails.forEach(e => parts.push(`  • ${esc(e.subject)}`));
  }

  // Affirmation
  parts.push('');
  parts.push(`💎 <b>Today's Affirmation</b>`);
  parts.push(`  <i>${getDailyAffirmation()}</i>`);

  await sendMessage(CHAT_ID, parts.join('\n'));

  // Mood check-in follow-up
  await sendMessage(
    CHAT_ID,
    `💭 <b>How are you feeling today?</b>\n\nReply with a number:\n1️⃣ Struggling 😞\n2️⃣ Bit rough 😕\n3️⃣ Getting by 😐\n4️⃣ Pretty good 😊\n5️⃣ Amazing! 🤩`
  );
}

async function sendAfternoonCheckin(data: DashboardData, refreshToken: string | null): Promise<void> {
  const accessToken = refreshToken ? await getAccessToken(refreshToken) : null;
  const gmailResult = accessToken
    ? await scanGmail(accessToken, 9)
    : { universityEmails: [], billAlerts: [], urgentEmails: [] };

  // Save new university emails
  if (gmailResult.universityEmails.length > 0) {
    const newEmails = gmailResult.universityEmails.map(e => ({
      id: e.id, from: e.from, subject: e.subject, snippet: e.snippet, receivedAt: e.receivedAt,
    }));
    const existing = new Set((data.universityEmails ?? []).map(e => e.id));
    const toAdd = newEmails.filter(e => !existing.has(e.id));
    if (toAdd.length > 0) {
      await saveUserData(USER_EMAIL, {
        ...data,
        universityEmails: [...toAdd, ...(data.universityEmails ?? [])].slice(0, 50),
      });
    }
  }

  const openTasks = data.weekly.tasks.filter(t => !t.done);
  const now = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
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
}

async function sendEveningRecap(data: DashboardData): Promise<void> {
  const tasks = data.weekly.tasks;
  const done = tasks.filter(t => t.done);
  const open = tasks.filter(t => !t.done);
  const dateStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
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
}

async function sendWeeklySpend(data: DashboardData): Promise<void> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekExpenses = (data.expenses ?? []).filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd }); }
    catch { return false; }
  });

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
    sorted.forEach(([cat, amt]) => parts.push(`  ${cat.padEnd(maxLen)}  ${fmt(amt)}`));
    parts.push(`  ${'─'.repeat(maxLen + 10)}`);
    parts.push(`  ${'Total'.padEnd(maxLen)}  <b>${fmt(total)}</b>`);
  } else {
    parts.push(`  <i>No expenses logged this week.</i>`);
    parts.push(`  Try: <code>spent $25 groceries</code>`);
  }

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
}

async function sendReflection(): Promise<void> {
  const weekNum = Math.floor(Date.now() / (7 * 86_400_000));
  const set = REFLECTION_PROMPTS[weekNum % REFLECTION_PROMPTS.length];

  const parts = [
    `🌿 <b>Sunday Reflection</b>`,
    ``,
    `Take a few quiet minutes to reflect on your week.`,
    ``,
    ...set.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `<i>Reply with your thoughts — I'll save them as a journal entry.</i>`,
    `<i>(Start your reply with </i><code>note </code><i> to save it.)</i>`,
  ];

  await sendMessage(CHAT_ID, parts.join('\n'));
}

async function sendMonthlySummary(data: DashboardData): Promise<void> {
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
  parts.push(`📝 <b>Journal</b>`);
  parts.push(`  ${monthJournal.length} entr${monthJournal.length === 1 ? 'y' : 'ies'} written`);
  if (monthJournal.length > 0) {
    monthJournal.slice(-2).forEach(e => {
      const d = format(parseISO(e.timestamp), 'MMM d');
      const preview = esc(e.text.slice(0, 60)) + (e.text.length > 60 ? '…' : '');
      parts.push(`  • <i>${d}: "${preview}"</i>`);
    });
  }

  parts.push('');
  parts.push(`😊 <b>Mood</b>`);
  if (avgMood) {
    const moodEmoji = parseFloat(avgMood) >= 4 ? '😊' : parseFloat(avgMood) >= 3 ? '😐' : '😔';
    parts.push(`  Average: <b>${avgMood}/5</b> ${moodEmoji}`);
    if (bestDay) parts.push(`  Best day: ${format(parseISO(bestDay.date), 'MMM d')} (score: ${bestDay.score})`);
  } else {
    parts.push('  <i>No mood data this month</i>');
  }

  if (totalSpend > 0) {
    parts.push('');
    parts.push(`💰 <b>Spending</b>`);
    parts.push(`  Total: <b>$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>`);
  }

  parts.push('');
  parts.push(`Keep growing, Char. Every month you get stronger. 🌱`);

  await sendMessage(CHAT_ID, parts.join('\n'));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
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

    const { hour, dayOfWeek, dayOfMonth } = getChicagoTime();

    // Always: fire pending user reminders
    const updatedData = await checkReminders(data);

    // 7 AM: morning briefing (includes exams/assignments, Gmail, weather)
    if (hour === 7) {
      await sendMorningBriefing(updatedData, refreshToken);
      if (dayOfMonth === 1) {
        await sendMonthlySummary(updatedData);
      }
    }

    // 4 PM: afternoon check-in + Gmail
    if (hour === 16) {
      await sendAfternoonCheckin(updatedData, refreshToken);
    }

    // 9 PM: evening recap
    if (hour === 21) {
      await sendEveningRecap(updatedData);
    }

    // Sunday 6 PM: weekly spending summary
    if (dayOfWeek === 0 && hour === 18) {
      await sendWeeklySpend(updatedData);
    }

    // Sunday 7 PM: reflection prompts
    if (dayOfWeek === 0 && hour === 19) {
      await sendReflection();
    }

    return NextResponse.json({ ok: true, hour, dayOfWeek, dayOfMonth });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
