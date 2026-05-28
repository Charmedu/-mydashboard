function apiBase() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendMessage(chatId: string, html: string, extra?: Record<string, any>): Promise<void> {
  const res = await fetch(`${apiBase()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', ...extra }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
}

export async function requestLocation(chatId: string): Promise<void> {
  await sendMessage(
    chatId,
    '📍 <b>Share your location</b>\n\nTap the button below and I\'ll fetch the current forecast for your exact spot!',
    {
      reply_markup: {
        keyboard: [[{ text: '📍 Share My Location', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

export async function removeKeyboard(chatId: string, text: string): Promise<void> {
  await sendMessage(chatId, text, { reply_markup: { remove_keyboard: true } });
}

export async function setWebhook(
  webhookUrl: string
): Promise<{ ok: boolean; description?: string; result?: boolean }> {
  const res = await fetch(`${apiBase()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
    cache: 'no-store',
  });
  const json = await res.json();
  return json as { ok: boolean; description?: string; result?: boolean };
}

export async function getWebhookInfo(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${apiBase()}/getWebhookInfo`, { cache: 'no-store' });
    const json = await res.json();
    return json as Record<string, unknown>;
  } catch (e) {
    return { error: String(e) };
  }
}
