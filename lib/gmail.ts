export interface GmailMessage {
  id: string;
  threadId: string;
  messageId: string;   // RFC 2822 Message-ID header
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  needsResponse: boolean;
}

export interface GmailScanResult {
  universityEmails: GmailMessage[];
  billAlerts: GmailMessage[];
  urgentEmails: GmailMessage[];
  needsReplyEmails: GmailMessage[]; // subset across all categories needing a response
}

const UNI_KEYWORDS = ['.edu', 'admissions', 'financial aid', 'registrar', 'enrollment', 'scholarship', 'transcript', 'bursar', 'tccd', 'canvas', 'graduation', 'fafsa', 'financial award'];
const BILL_KEYWORDS = ['payment due', 'bill', 'invoice', 'statement', 'amount due', 'minimum payment', 'past due', 'overdue', 'your payment', 'autopay'];
const URGENT_KEYWORDS = ['urgent', 'action required', 'important:', 'immediately', 'deadline:', 'expires', 'final notice', 'verify your'];
const NOREPLY_PATTERNS = /noreply|no-reply|donotreply|do-not-reply|notification|automated|mailer-daemon/i;
const RESPONSE_NEEDED_SUBJECT = /question|inquiry|request|confirm|please respond|reply needed|following up|follow-up|help needed|your feedback/i;

function isUni(from: string, subject: string): boolean {
  const t = (from + ' ' + subject).toLowerCase();
  return UNI_KEYWORDS.some(k => t.includes(k));
}
function isBill(subject: string, snippet: string): boolean {
  const t = (subject + ' ' + snippet).toLowerCase();
  return BILL_KEYWORDS.some(k => t.includes(k));
}
function isUrgent(subject: string): boolean {
  return URGENT_KEYWORDS.some(k => subject.toLowerCase().includes(k));
}
function checkNeedsResponse(from: string, subject: string, snippet: string): boolean {
  if (NOREPLY_PATTERNS.test(from)) return false;
  if (snippet.includes('?') || subject.includes('?')) return true;
  if (RESPONSE_NEEDED_SUBJECT.test(subject)) return true;
  return false;
}

export async function scanGmail(accessToken: string, hoursBack = 24): Promise<GmailScanResult> {
  const result: GmailScanResult = { universityEmails: [], billAlerts: [], urgentEmails: [], needsReplyEmails: [] };
  try {
    const after = Math.floor((Date.now() - hoursBack * 3_600_000) / 1000);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${after}&maxResults=25`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) return result;

    const listData = await listRes.json() as { messages?: Array<{ id: string; threadId: string }> };
    if (!listData.messages?.length) return result;

    await Promise.all(listData.messages.slice(0, 20).map(async (msg) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!msgRes.ok) return;
        const m = await msgRes.json() as {
          id: string; threadId: string; snippet: string;
          payload: { headers: Array<{ name: string; value: string }> };
          internalDate: string;
        };
        const from = m.payload.headers.find(h => h.name === 'From')?.value ?? '';
        const subject = m.payload.headers.find(h => h.name === 'Subject')?.value ?? '';
        const messageId = m.payload.headers.find(h => h.name === 'Message-ID')?.value ?? '';
        const snippet = m.snippet ?? '';
        const needsReply = checkNeedsResponse(from, subject, snippet);

        const entry: GmailMessage = {
          id: m.id, threadId: m.threadId, messageId, from, subject, snippet,
          receivedAt: new Date(parseInt(m.internalDate)).toISOString(),
          needsResponse: needsReply,
        };

        if (isUni(from, subject)) result.universityEmails.push(entry);
        else if (isBill(subject, snippet)) result.billAlerts.push(entry);
        else if (isUrgent(subject)) result.urgentEmails.push(entry);

        if (needsReply) result.needsReplyEmails.push(entry);
      } catch { /* skip */ }
    }));
  } catch { /* return empty */ }
  return result;
}

// ── Gmail send ────────────────────────────────────────────────────────────────

function encodeSubject(s: string): string {
  // RFC 2047 encode if non-ASCII
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`;
}

function buildRawMessage(options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}): string {
  const lines = [
    `To: ${options.to}`,
    `Subject: ${encodeSubject(options.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
  ];
  if (options.inReplyTo) {
    lines.push(`In-Reply-To: ${options.inReplyTo}`);
    lines.push(`References: ${options.inReplyTo}`);
  }
  lines.push('', options.body);
  return lines.join('\r\n');
}

export async function sendGmailMessage(
  accessToken: string,
  options: {
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;  // RFC 2822 Message-ID of email being replied to
    threadId?: string;   // Gmail thread ID for threading
  }
): Promise<{ id: string; threadId: string } | null> {
  const raw = Buffer.from(buildRawMessage(options))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const payload: Record<string, string> = { raw };
  if (options.threadId) payload.threadId = options.threadId;

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string; threadId: string }>;
  } catch { return null; }
}
