export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

export interface GmailScanResult {
  universityEmails: GmailMessage[];
  billAlerts: GmailMessage[];
  urgentEmails: GmailMessage[];
}

const UNI_KEYWORDS = ['.edu', 'admissions', 'financial aid', 'registrar', 'enrollment', 'scholarship', 'transcript', 'bursar', 'tccd', 'canvas', 'graduation', 'fafsa', 'financial award'];
const BILL_KEYWORDS = ['payment due', 'bill', 'invoice', 'statement', 'amount due', 'minimum payment', 'past due', 'overdue', 'your payment', 'autopay'];
const URGENT_KEYWORDS = ['urgent', 'action required', 'important:', 'immediately', 'deadline:', 'expires', 'final notice', 'verify your'];

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

export async function scanGmail(accessToken: string, hoursBack = 24): Promise<GmailScanResult> {
  const result: GmailScanResult = { universityEmails: [], billAlerts: [], urgentEmails: [] };
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
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
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
        const entry: GmailMessage = {
          id: m.id, threadId: m.threadId, from, subject,
          snippet: m.snippet ?? '',
          receivedAt: new Date(parseInt(m.internalDate)).toISOString(),
        };
        if (isUni(from, subject)) result.universityEmails.push(entry);
        else if (isBill(subject, entry.snippet)) result.billAlerts.push(entry);
        else if (isUrgent(subject)) result.urgentEmails.push(entry);
      } catch { /* skip */ }
    }));
  } catch { /* return empty */ }
  return result;
}
