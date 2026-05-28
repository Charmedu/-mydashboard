import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData, saveUserData, loadUserToken } from '@/lib/db';
import { sendMessage, requestLocation, removeKeyboard } from '@/lib/telegram';
import { getWeather, reverseGeocode } from '@/lib/weather';
import { generateQuiz, findAndSummarize, getRandomQuote, getLowMoodEncouragement } from '@/lib/ai';
import { sendGmailMessage } from '@/lib/gmail';
import { format, startOfWeek, addHours, addMinutes } from 'date-fns';
import type { DashboardData, Task, Reminder, Expense, JournalEntry, MoodEntry, UserLocation } from '@/lib/types';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';
const USER_EMAIL = process.env.USER_EMAIL ?? '';

const QUICK_LINKS: Record<string, string> = {
  canvas: 'https://canvas.tccd.edu',
  gmail: 'https://mail.google.com',
  calendar: 'https://calendar.google.com',
  notebooklm: 'https://notebooklm.google.com',
  youtube: 'https://youtube.com',
  search: 'https://google.com',
  dashboard: 'https://mydashboard-xi-one.vercel.app',
};

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function safeCalc(expr: string): string {
  if (!/^[\d\s+\-*/().%]+$/.test(expr.trim())) return 'Invalid — only basic math operators allowed (+, -, *, /, %)';
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result !== 'number' || !isFinite(result)) return 'Math error';
    return String(Math.round(result * 1_000_000) / 1_000_000);
  } catch { return 'Could not calculate that.'; }
}

// "tomorrow 3pm", "thursday 10:30am", "today 5pm"
function parseDateTime(input: string): Date | null {
  const lower = input.toLowerCase().trim();
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!timeMatch) return null;
  let h = parseInt(timeMatch[1]);
  const m = parseInt(timeMatch[2] ?? '0');
  const ap = timeMatch[3];
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;

  const base = new Date();
  if (lower.startsWith('today')) { /* keep today */ }
  else if (lower.startsWith('tomorrow')) { base.setDate(base.getDate() + 1); }
  else {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const idx = days.findIndex(d => lower.startsWith(d));
    if (idx < 0) return null;
    let diff = idx - base.getDay();
    if (diff <= 0) diff += 7;
    base.setDate(base.getDate() + diff);
  }
  base.setHours(h, m, 0, 0);
  return base;
}

function parseReminder(cmd: string): { text: string; dueAt: Date } | null {
  // "remind me to [text] [day] [time]"
  const toMatch = cmd.match(/^remind me to (.+?)\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (toMatch) {
    const dt = parseDateTime(`${toMatch[2]} ${toMatch[3]}`);
    if (dt) return { text: toMatch[1], dueAt: dt };
  }
  // "remind me in [N] hours/minutes to [text]"
  const inMatch = cmd.match(/^remind me in (\d+)\s+(hours?|minutes?|mins?)\s+to\s+(.+)/i);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();
    const dueAt = unit.startsWith('h') ? addHours(new Date(), n) : addMinutes(new Date(), n);
    return { text: inMatch[3], dueAt };
  }
  return null;
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

async function checkCalendarConflict(accessToken: string, dt: Date): Promise<string[]> {
  try {
    const start = new Date(dt); start.setMinutes(start.getMinutes() - 5);
    const end = new Date(dt); end.setMinutes(end.getMinutes() + 65);
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', start.toISOString());
    url.searchParams.set('timeMax', end.toISOString());
    url.searchParams.set('singleEvents', 'true');
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const json = await res.json() as { items?: Array<{ summary?: string }> };
    return (json.items ?? []).map(e => e.summary ?? '(untitled)');
  } catch { return []; }
}

interface TelegramMessage {
  chat: { id: number };
  text?: string;
  location?: { latitude: number; longitude: number };
}
interface TelegramUpdate { message?: TelegramMessage; }

export async function POST(req: NextRequest): Promise<NextResponse> {
  let update: TelegramUpdate;
  try { update = await req.json() as TelegramUpdate; }
  catch (e) {
    console.error('[webhook] Failed to parse JSON body:', e);
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg) {
    console.log('[webhook] Update has no .message field — type:', Object.keys(update ?? {}).join(', ') || 'empty');
    return NextResponse.json({ ok: true });
  }
  if (String(msg.chat.id) !== CHAT_ID) {
    console.error('[webhook] Chat ID mismatch — received:', msg.chat.id, '| expected:', CHAT_ID || '(TELEGRAM_CHAT_ID not set)');
    return NextResponse.json({ ok: true });
  }

  if (!USER_EMAIL) {
    console.error('[webhook] USER_EMAIL env var is not set');
    await sendMessage(CHAT_ID, '❌ Bot is misconfigured (USER_EMAIL missing).');
    return NextResponse.json({ ok: true });
  }

  await initDb();
  const data = await loadUserData(USER_EMAIL);
  if (!data) {
    console.error('[webhook] loadUserData returned null for:', USER_EMAIL);
    await sendMessage(CHAT_ID, '❌ Could not load your dashboard data.');
    return NextResponse.json({ ok: true });
  }

  console.log('[webhook] Processing message from chat', msg.chat.id, '—', msg.text ? `text: "${msg.text.slice(0, 60)}"` : msg.location ? 'location share' : 'other');

  // Handle location messages (user tapped "Share My Location")
  if (msg.location) {
    await handleLocation(msg.location.latitude, msg.location.longitude, data);
    return NextResponse.json({ ok: true });
  }

  if (!msg.text) return NextResponse.json({ ok: true });

  const raw = (msg.text.startsWith('/') ? msg.text.slice(1) : msg.text).trim();
  const cmd = raw.toLowerCase();

  // ── done ─────────────────────────────────────────────────────────────────
  if (cmd.startsWith('done')) {
    await handleDone(cmd, data);

  // ── mood score (single digit 1-5) ────────────────────────────────────────
  } else if (/^[1-5]$/.test(cmd)) {
    await handleMood(parseInt(cmd), data);

  // ── weather ───────────────────────────────────────────────────────────────
  } else if (cmd === 'weather' || cmd === 'weather this week' || cmd === 'weather week') {
    await requestLocation(CHAT_ID);

  // ── study timer ──────────────────────────────────────────────────────────
  } else if (cmd.startsWith('study timer')) {
    const match = cmd.match(/study timer\s+(\d+)/);
    const mins = match ? parseInt(match[1]) : 25;
    const dueAt = addMinutes(new Date(), mins);
    const reminder: Reminder = {
      id: crypto.randomUUID(), sent: false, createdAt: new Date().toISOString(),
      text: `⏰ Focus session complete! You studied for ${mins} minutes. Great work! Take a 5-min break. 🧠`,
      dueAt: dueAt.toISOString(),
    };
    const updated: DashboardData = { ...data, reminders: [...(data.reminders ?? []), reminder] };
    await saveUserData(USER_EMAIL, updated);
    await sendMessage(CHAT_ID, `🎯 <b>Focus session started!</b>\n\nI\'ll check in with you at <b>${format(dueAt, 'h:mm a')}</b> (${mins} minutes).\n\nPut your phone down and focus. You\'ve got this! 💪`);

  // ── quiz me ──────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('quiz me on ') || cmd.startsWith('quiz ')) {
    const subject = raw.replace(/^quiz me on /i, '').replace(/^quiz /i, '').trim();
    await sendMessage(CHAT_ID, `📚 Generating quiz on <b>${esc(subject)}</b>…`);
    const quiz = await generateQuiz(subject);
    await sendMessage(CHAT_ID, `📚 <b>Quiz: ${esc(subject)}</b>\n\n${esc(quiz)}`);

  // ── reschedule ───────────────────────────────────────────────────────────
  } else if (cmd.startsWith('reschedule ')) {
    const match = cmd.match(/^reschedule\s+(\d+)\s+(.+)/);
    if (!match) {
      await sendMessage(CHAT_ID, '❓ Format: <code>reschedule 2 tomorrow 3pm</code>');
    } else {
      const openTasks = data.weekly.tasks.filter(t => !t.done);
      const idx = parseInt(match[1]) - 1;
      if (idx < 0 || idx >= openTasks.length) {
        await sendMessage(CHAT_ID, `❓ Task number out of range. You have ${openTasks.length} open tasks.`);
      } else {
        const dt = parseDateTime(match[2]);
        if (!dt) {
          await sendMessage(CHAT_ID, '❓ Could not parse date/time. Try: <code>reschedule 2 tomorrow 3pm</code>');
        } else {
          const task = openTasks[idx];
          const refreshToken = await loadUserToken(USER_EMAIL);
          const accessToken = refreshToken ? await getAccessToken(refreshToken) : null;
          const conflicts = accessToken ? await checkCalendarConflict(accessToken, dt) : [];

          const updatedTasks: Task[] = data.weekly.tasks.map(t =>
            t.id === task.id ? { ...t, dueDate: dt.toISOString() } : t
          );
          await saveUserData(USER_EMAIL, { ...data, weekly: { ...data.weekly, tasks: updatedTasks } });

          const dtStr = format(dt, 'EEEE, MMM d \'at\' h:mm a');
          const parts = [`✅ <b>Rescheduled:</b> "${esc(task.text)}" → ${dtStr}`];
          if (conflicts.length > 0) {
            parts.push(`⚠️ <b>Calendar conflict:</b> ${conflicts.map(esc).join(', ')}`);
          } else {
            parts.push(`✔️ No calendar conflicts.`);
          }
          await sendMessage(CHAT_ID, parts.join('\n'));
        }
      }
    }

  // ── reminders ────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('remind me')) {
    const parsed = parseReminder(cmd);
    if (!parsed) {
      await sendMessage(CHAT_ID, '❓ Try:\n<code>remind me to review notes tomorrow 3pm</code>\n<code>remind me in 2 hours to take medication</code>');
    } else {
      const reminder: Reminder = {
        id: crypto.randomUUID(), sent: false, createdAt: new Date().toISOString(),
        text: parsed.text, dueAt: parsed.dueAt.toISOString(),
      };
      await saveUserData(USER_EMAIL, { ...data, reminders: [...(data.reminders ?? []), reminder] });
      await sendMessage(CHAT_ID, `✅ <b>Reminder set!</b>\n"${esc(parsed.text)}"\n🕐 ${format(parsed.dueAt, 'EEE, MMM d \'at\' h:mm a')}`);
    }

  // ── quick launch ─────────────────────────────────────────────────────────
  } else if (cmd.startsWith('open ')) {
    const site = cmd.slice(5).trim();
    const url = QUICK_LINKS[site];
    if (url) {
      await sendMessage(CHAT_ID, `🔗 <a href="${url}">${esc(site.charAt(0).toUpperCase() + site.slice(1))}</a>\n${url}`);
    } else {
      await sendMessage(CHAT_ID, `❓ Unknown site. Available: ${Object.keys(QUICK_LINKS).map(k => `<code>${k}</code>`).join(', ')}`);
    }

  // ── add task ─────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('add task ')) {
    const text = raw.slice(9).trim();
    const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const newTask: Task = { id: crypto.randomUUID(), text, done: false };
    const tasks = data.weekly.weekOf === weekOf
      ? [...data.weekly.tasks, newTask]
      : [newTask];
    const weekly = { ...data.weekly, weekOf, tasks };
    await saveUserData(USER_EMAIL, { ...data, weekly });
    await sendMessage(CHAT_ID, `✅ Task added: "${esc(text)}"`);

  // ── note / journal ────────────────────────────────────────────────────────
  } else if (cmd.startsWith('note ')) {
    const text = raw.slice(5).trim();
    const entry: JournalEntry = { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() };
    await saveUserData(USER_EMAIL, { ...data, journal: [...(data.journal ?? []), entry] });
    await sendMessage(CHAT_ID, `📝 Journal entry saved.\n<i>"${esc(text.slice(0, 80))}${text.length > 80 ? '…' : ''}"</i>`);

  // ── bucket list ──────────────────────────────────────────────────────────
  } else if (cmd.startsWith('bucket list ') || cmd.startsWith('bucket ')) {
    const text = raw.replace(/^bucket list /i, '').replace(/^bucket /i, '').trim();
    const item = { id: crypto.randomUUID(), text, category: 'Experience' as const, done: false };
    await saveUserData(USER_EMAIL, { ...data, bucketList: [...data.bucketList, item] });
    await sendMessage(CHAT_ID, `🪣 Added to bucket list: "${esc(text)}"`);

  // ── book ─────────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('book ')) {
    const title = raw.slice(5).trim();
    const book = { id: crypto.randomUUID(), title, author: 'Unknown', status: 'want-to-read' as const };
    await saveUserData(USER_EMAIL, { ...data, books: [...data.books, book] });
    await sendMessage(CHAT_ID, `📖 Added to reading list: "${esc(title)}"\n<i>Update the author in the dashboard Books tab.</i>`);

  // ── spent / spend ─────────────────────────────────────────────────────────
  } else if (cmd.startsWith('spent ') || cmd.startsWith('spend ')) {
    const match = raw.match(/^spend?\s+\$?([\d.]+)\s+(.+)/i);
    if (!match) {
      await sendMessage(CHAT_ID, '❓ Format: <code>spent $45 groceries</code>');
    } else {
      const amount = parseFloat(match[1]);
      const category = match[2].trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const expense: Expense = {
        id: crypto.randomUUID(), amount, category,
        date: format(new Date(), 'yyyy-MM-dd'),
      };
      await saveUserData(USER_EMAIL, { ...data, expenses: [...(data.expenses ?? []), expense] });
      await sendMessage(CHAT_ID, `💸 Logged: <b>$${amount.toFixed(2)}</b> — ${esc(category)}`);
    }

  // ── send link ─────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('send link ')) {
    const url = raw.slice(10).trim();
    await sendMessage(CHAT_ID, `🔗 <a href="${url}">${esc(url)}</a>`);

  // ── save article ─────────────────────────────────────────────────────────
  } else if (cmd.startsWith('save article ')) {
    const url = raw.slice(13).trim();
    const title = await fetchPageTitle(url);
    const article = { id: crypto.randomUUID(), url, title: title ?? undefined, savedAt: new Date().toISOString() };
    await saveUserData(USER_EMAIL, { ...data, savedArticles: [...(data.savedArticles ?? []), article] });
    if (title) {
      await sendMessage(CHAT_ID, `📌 <b>${esc(title)}</b>\nSaved to reading list. <a href="${url}">${esc(url.length > 60 ? url.slice(0, 60) + '…' : url)}</a>`);
    } else {
      await sendMessage(CHAT_ID, `📌 Article saved to reading list.\n<a href="${url}">${esc(url)}</a>`);
    }

  // ── find / search ─────────────────────────────────────────────────────────
  } else if (cmd.startsWith('find ')) {
    const topic = raw.slice(5).trim();
    await sendMessage(CHAT_ID, `🔍 Looking up <b>${esc(topic)}</b>…`);
    const summary = await findAndSummarize(topic);
    await sendMessage(CHAT_ID, `🔍 <b>${esc(topic)}</b>\n\n${esc(summary)}`);

  // ── directions ───────────────────────────────────────────────────────────
  } else if (cmd.startsWith('directions to ')) {
    const place = raw.slice(14).trim();
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
    await sendMessage(CHAT_ID, `🗺️ <b>Directions to ${esc(place)}</b>\n<a href="${mapsUrl}">Open in Google Maps</a>`);

  // ── translate ─────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('translate ')) {
    const text = raw.slice(10).trim();
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`);
      const d = await res.json() as { responseData?: { translatedText?: string }; responseStatus?: number };
      const translated = d.responseData?.translatedText;
      if (translated && translated !== text) {
        await sendMessage(CHAT_ID, `🌐 <b>Translation</b>\n<i>${esc(text)}</i>\n↓\n${esc(translated)}`);
      } else {
        await sendMessage(CHAT_ID, `🌐 Already in English (or could not detect language).`);
      }
    } catch {
      await sendMessage(CHAT_ID, `❌ Translation service unavailable.`);
    }

  // ── define ────────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('define ')) {
    const word = raw.slice(7).trim().split(' ')[0];
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error('not found');
      const entries = await res.json() as Array<{ meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string }> }> }>;
      const meaning = entries[0]?.meanings?.[0];
      const def = meaning?.definitions?.[0]?.definition ?? 'No definition found.';
      const pos = meaning?.partOfSpeech ?? '';
      await sendMessage(CHAT_ID, `📖 <b>${esc(word)}</b>${pos ? ` <i>(${pos})</i>` : ''}\n${esc(def)}`);
    } catch {
      await sendMessage(CHAT_ID, `❓ Could not find a definition for "${esc(word)}".`);
    }

  // ── calculate ─────────────────────────────────────────────────────────────
  } else if (cmd.startsWith('calculate ') || cmd.startsWith('calc ')) {
    const expr = raw.replace(/^calculate\s+/i, '').replace(/^calc\s+/i, '').trim();
    const result = safeCalc(expr);
    await sendMessage(CHAT_ID, `🧮 <code>${esc(expr)}</code> = <b>${esc(result)}</b>`);

  // ── reply [sender] [message] ──────────────────────────────────────────────
  } else if (cmd.startsWith('reply ')) {
    const match = raw.match(/^reply\s+(\S+)\s+([\s\S]+)/i);
    if (!match) {
      await sendMessage(CHAT_ID, '❓ Format: <code>reply [sender] your message</code>\nSender can be a name, email, or part of either.');
    } else {
      const senderHint = match[1].toLowerCase();
      const body = match[2].trim();
      const stored = data.universityEmails ?? [];
      const matched = stored.find(e =>
        e.from.toLowerCase().includes(senderHint) ||
        e.subject.toLowerCase().includes(senderHint)
      );
      if (!matched) {
        await sendMessage(CHAT_ID, `❌ No stored email matching "<b>${esc(match[1])}</b>". Check your morning briefing.`);
      } else {
        const refreshToken = await loadUserToken(USER_EMAIL);
        const accessToken = refreshToken ? await getAccessToken(refreshToken) : null;
        if (!accessToken) {
          await sendMessage(CHAT_ID, '❌ Could not get Gmail access. Try signing in again.');
        } else {
          const subject = matched.subject.startsWith('Re:') ? matched.subject : `Re: ${matched.subject}`;
          const toEmail = matched.from.match(/<([^>]+)>/)?.[1] ?? matched.from;
          const sent = await sendGmailMessage(accessToken, {
            to: toEmail, subject, body,
            inReplyTo: matched.messageId,
            threadId: matched.threadId,
          });
          if (sent) {
            await sendMessage(CHAT_ID, `✅ <b>Reply sent!</b>\nTo: ${esc(matched.from)}\nSubject: ${esc(subject)}`);
          } else {
            await sendMessage(CHAT_ID, '❌ Failed to send reply. Check Gmail access and try again.');
          }
        }
      }
    }

  // ── email [recipient] re: [subject] | [body] ──────────────────────────────
  } else if (cmd.startsWith('email ')) {
    const match = raw.match(/^email\s+(\S+)\s+re:\s+([\s\S]+)/i);
    if (!match) {
      await sendMessage(CHAT_ID, '❓ Format: <code>email recipient@example.com re: Subject | Body text</code>\n<i>Use | to separate subject from body. Without |, the text is used as both.</i>');
    } else {
      const to = match[1].trim();
      const rest = match[2].trim();
      const pipeIdx = rest.indexOf(' | ');
      const subject = pipeIdx >= 0 ? rest.slice(0, pipeIdx).trim() : rest.trim();
      const body = pipeIdx >= 0 ? rest.slice(pipeIdx + 3).trim() : rest.trim();
      const refreshToken = await loadUserToken(USER_EMAIL);
      const accessToken = refreshToken ? await getAccessToken(refreshToken) : null;
      if (!accessToken) {
        await sendMessage(CHAT_ID, '❌ Could not get Gmail access. Try signing in again.');
      } else {
        const sent = await sendGmailMessage(accessToken, { to, subject, body });
        if (sent) {
          await sendMessage(CHAT_ID, `✅ <b>Email sent!</b>\nTo: ${esc(to)}\nSubject: ${esc(subject)}`);
        } else {
          await sendMessage(CHAT_ID, '❌ Failed to send. Check the address and try again.');
        }
      }
    }

  // ── motivate me ───────────────────────────────────────────────────────────
  } else if (cmd === 'motivate me' || cmd === 'motivate') {
    await sendMessage(CHAT_ID, `💪 <b>Power Quote</b>\n\n${getRandomQuote()}`);

  // ── unknown ───────────────────────────────────────────────────────────────
  } else {
    const help = [
      `👋 Hi Char! Here's what I can do:`,
      ``,
      `<b>Tasks:</b> <code>add task [text]</code> · <code>done 1 2</code> · <code>done all</code>`,
      `<code>reschedule 2 tomorrow 3pm</code>`,
      ``,
      `<b>Reminders:</b> <code>remind me to [task] tomorrow 3pm</code>`,
      `<code>remind me in 30 minutes to [task]</code>`,
      ``,
      `<b>Capture:</b> <code>note [text]</code> · <code>spent $45 groceries</code>`,
      `<code>bucket list [text]</code> · <code>book [title]</code>`,
      ``,
      `<b>Study:</b> <code>study timer 45</code> · <code>quiz me on [subject]</code>`,
      ``,
      `<b>Info:</b> <code>weather this week</code> · <code>find [topic]</code>`,
      `<code>define [word]</code> · <code>translate [text]</code> · <code>calculate [math]</code>`,
      `<code>directions to [place]</code>`,
      ``,
      `<b>Email:</b> <code>reply [sender] your message</code>`,
      `<code>email to@example.com re: Subject | Body</code>`,
      ``,
      `<b>Links:</b> <code>open canvas</code> · <code>open gmail</code> · <code>open calendar</code>`,
      `<code>open notebooklm</code> · <code>open youtube</code> · <code>open dashboard</code>`,
      `<code>send link [url]</code> · <code>save article [url]</code>`,
      ``,
      `<b>Mood:</b> Reply <code>1</code>–<code>5</code> after morning check-in`,
      `<b>Motivation:</b> <code>motivate me</code>`,
    ];
    await sendMessage(CHAT_ID, help.join('\n'));
  }

  return NextResponse.json({ ok: true });
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyDashboard/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    if (!match) return null;
    return match[1].trim()
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  } catch { return null; }
}

async function handleLocation(lat: number, lon: number, data: DashboardData): Promise<void> {
  const location: UserLocation = { lat, lng: lon, timestamp: new Date().toISOString() };
  await saveUserData(USER_EMAIL, { ...data, lastLocation: location });

  const [weather, cityName] = await Promise.all([
    getWeather(lat, lon),
    reverseGeocode(lat, lon),
  ]);

  const locationLabel = cityName ?? `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

  if (!weather) {
    await removeKeyboard(CHAT_ID, `❌ Could not fetch weather for ${esc(locationLabel)}.`);
    return;
  }

  const lines = [
    `🌡️ <b>${esc(locationLabel)} — 7-Day Forecast</b>`,
    `<i>Now: ${weather.current.emoji} ${weather.current.temp}°F · ${weather.current.description}</i>`,
    weather.current.willRain ? `☂️ ${weather.current.rainChance}% rain chance today` : '',
    '',
    ...weather.week.map(d => `${d.emoji} <b>${d.date}</b>  ${d.high}° / ${d.low}°  ${d.description}  💧${d.rainChance}%`),
  ].filter(l => l !== '');

  await removeKeyboard(CHAT_ID, lines.join('\n'));
}

// ── command handlers ─────────────────────────────────────────────────────────

async function handleDone(cmd: string, data: DashboardData): Promise<void> {
  const openTasks = data.weekly.tasks.filter(t => !t.done);
  if (openTasks.length === 0) {
    await sendMessage(CHAT_ID, '🎉 No open tasks — everything is already done!');
    return;
  }

  let targetIds: string[];
  if (cmd === 'done all') {
    targetIds = openTasks.map(t => t.id);
  } else {
    const rest = cmd.replace(/^done\s*/, '').replace(/,/g, ' ');
    const nums = rest.split(/\s+/).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= openTasks.length);
    targetIds = Array.from(new Set(nums)).map(n => openTasks[n - 1].id);
  }

  if (targetIds.length === 0) {
    await sendMessage(CHAT_ID, `❓ No matching tasks. You have ${openTasks.length} open task${openTasks.length !== 1 ? 's' : ''} (1–${openTasks.length}).`);
    return;
  }

  const updated = { ...data, weekly: { ...data.weekly, tasks: data.weekly.tasks.map(t => targetIds.includes(t.id) ? { ...t, done: true } : t) } };
  await saveUserData(USER_EMAIL, updated);

  const checkedNames = targetIds.map(id => openTasks.find(t => t.id === id)?.text ?? '').filter(Boolean);
  const remaining = openTasks.length - targetIds.length;
  const lines = [
    `✅ Checked off ${checkedNames.length} task${checkedNames.length !== 1 ? 's' : ''}:`,
    ...checkedNames.map(n => `  • ${esc(n)}`),
    '',
    remaining > 0 ? `📋 ${remaining} task${remaining !== 1 ? 's' : ''} still open.` : '🎉 All tasks complete!',
  ];
  await sendMessage(CHAT_ID, lines.join('\n'));
}

async function handleMood(score: number, data: DashboardData): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const existing = (data.mood ?? []).find(m => m.date === today);

  if (existing) {
    await sendMessage(CHAT_ID, `You already logged a mood of ${existing.score}/5 today. Reply 1–5 tomorrow morning! 😊`);
    return;
  }

  const entry: MoodEntry = { id: crypto.randomUUID(), date: today, score };
  const updated: DashboardData = { ...data, mood: [...(data.mood ?? []), entry] };
  await saveUserData(USER_EMAIL, updated);

  const emojis: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' };
  const labels: Record<number, string> = { 1: 'Struggling', 2: 'Bit rough', 3: 'Getting by', 4: 'Pretty good', 5: 'Amazing!' };

  await sendMessage(CHAT_ID, `${emojis[score]} Mood logged: <b>${score}/5</b> — ${labels[score]}\n<i>Saved to your dashboard.</i>`);

  if (score <= 2) {
    await sendMessage(CHAT_ID, getLowMoodEncouragement());
  }
}
