function apiBase() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}

export async function sendMessage(chatId: string, html: string): Promise<void> {
  const res = await fetch(`${apiBase()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
}

export async function setWebhook(
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  const payload: Record<string, string> = { url: webhookUrl };
  if (secretToken) payload.secret_token = secretToken;
  const res = await fetch(`${apiBase()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{ ok: boolean; description?: string }>;
}
