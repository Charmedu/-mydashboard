import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserData, saveUserData } from '@/lib/db';
import { sendMessage } from '@/lib/telegram';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';
const USER_EMAIL = process.env.USER_EMAIL ?? '';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

interface TelegramMessage {
  chat: { id: number };
  text?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify the secret Telegram sends in the header (configured at webhook registration)
  if (WEBHOOK_SECRET) {
    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await req.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  // Ignore messages from anyone other than the configured owner
  if (String(msg.chat.id) !== CHAT_ID) return NextResponse.json({ ok: true });

  // Strip optional leading slash (/done → done)
  const cmd = (msg.text.startsWith('/') ? msg.text.slice(1) : msg.text).trim().toLowerCase();

  if (cmd.startsWith('done')) {
    await handleDone(cmd);
  }

  return NextResponse.json({ ok: true });
}

async function handleDone(cmd: string): Promise<void> {
  await initDb();
  const data = await loadUserData(USER_EMAIL);
  if (!data) {
    await sendMessage(CHAT_ID, '❌ Could not load your dashboard data.');
    return;
  }

  const openTasks = data.weekly.tasks.filter(t => !t.done);

  if (openTasks.length === 0) {
    await sendMessage(CHAT_ID, '🎉 No open tasks — everything is already done!');
    return;
  }

  let targetIds: string[];

  if (cmd === 'done all') {
    targetIds = openTasks.map(t => t.id);
  } else {
    // Parse "done 1 2 3" — also tolerate commas: "done 1, 2, 3"
    const rest = cmd.replace(/^done\s*/, '').replace(/,/g, ' ');
    const nums = rest
      .split(/\s+/)
      .map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= openTasks.length);
    targetIds = Array.from(new Set(nums)).map(n => openTasks[n - 1].id);
  }

  if (targetIds.length === 0) {
    await sendMessage(
      CHAT_ID,
      `❓ No matching tasks. You have ${openTasks.length} open task${openTasks.length !== 1 ? 's' : ''} (1–${openTasks.length}).`
    );
    return;
  }

  const updated = {
    ...data,
    weekly: {
      ...data.weekly,
      tasks: data.weekly.tasks.map(t => targetIds.includes(t.id) ? { ...t, done: true } : t),
    },
  };

  await saveUserData(USER_EMAIL, updated);

  const checkedNames = targetIds
    .map(id => openTasks.find(t => t.id === id)?.text ?? '')
    .filter(Boolean);
  const remaining = openTasks.length - targetIds.length;

  const lines = [
    `✅ Checked off ${checkedNames.length} task${checkedNames.length !== 1 ? 's' : ''}:`,
    ...checkedNames.map(n => `  • ${esc(n)}`),
    '',
    remaining > 0
      ? `📋 ${remaining} task${remaining !== 1 ? 's' : ''} still open.`
      : '🎉 All tasks complete!',
  ];

  await sendMessage(CHAT_ID, lines.join('\n'));
}
