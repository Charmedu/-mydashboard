import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/telegram';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

const PROMPTS = [
  ['What are you most proud of this week?', 'What\'s one thing you\'d do differently?', 'What are you looking forward to next week?'],
  ['What challenged you most this week, and what did you learn?', 'Who made a positive impact on your week?', 'What small win deserves more celebration?'],
  ['What drained your energy this week?', 'What recharged you?', 'What\'s one habit you want to strengthen next week?'],
  ['What surprised you this week?', 'Where did you show up for yourself?', 'What do you want to release before the new week begins?'],
];

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!CHAT_ID) return NextResponse.json({ error: 'TELEGRAM_CHAT_ID not set' }, { status: 500 });

  const weekNum = Math.floor(Date.now() / (7 * 86_400_000));
  const set = PROMPTS[weekNum % PROMPTS.length];

  const parts = [
    `🌿 <b>Sunday Reflection</b>`,
    ``,
    `Take a few quiet minutes to reflect on your week.`,
    ``,
    ...set.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `<i>Reply with your thoughts — I\'ll save them as a journal entry.</i>`,
    `<i>(Start your reply with </i><code>note </code><i> to save it.)</i>`,
  ];

  await sendMessage(CHAT_ID, parts.join('\n'));
  return NextResponse.json({ ok: true });
}
