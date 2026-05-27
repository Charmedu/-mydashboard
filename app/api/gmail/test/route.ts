import { NextRequest, NextResponse } from 'next/server';
import { initDb, loadUserToken } from '@/lib/db';

const USER_EMAIL = process.env.USER_EMAIL ?? '';

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
    const d = await res.json() as { access_token?: string; error?: string };
    if (!res.ok || !d.access_token) {
      return null;
    }
    return d.access_token;
  } catch { return null; }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Simple auth: require CRON_SECRET if set, otherwise allow (test endpoint)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!USER_EMAIL) {
    return NextResponse.json({ error: 'USER_EMAIL env var not set' }, { status: 500 });
  }

  try {
    await initDb();
    const refreshToken = await loadUserToken(USER_EMAIL);
    if (!refreshToken) {
      return NextResponse.json({
        error: 'No refresh token stored for USER_EMAIL. Sign in to the dashboard first.',
        hint: 'The refresh token is saved on sign-in via the dashboard.',
      }, { status: 400 });
    }

    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) {
      return NextResponse.json({
        error: 'Failed to exchange refresh token for access token.',
        hint: 'The token may be expired or the gmail.send scope may not have been granted yet. Sign out and sign back in.',
      }, { status: 401 });
    }

    // Fetch 5 most recent messages
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      const body = await listRes.text();
      return NextResponse.json({ error: `Gmail list failed (${listRes.status})`, detail: body }, { status: 502 });
    }

    const listData = await listRes.json() as { messages?: Array<{ id: string }> };
    if (!listData.messages?.length) {
      return NextResponse.json({ ok: true, emails: [], message: 'Inbox appears empty.' });
    }

    // Fetch subject + from for each message in parallel
    const emails = await Promise.all(
      listData.messages.map(async (msg) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!msgRes.ok) return { id: msg.id, error: `HTTP ${msgRes.status}` };
          const m = await msgRes.json() as {
            id: string;
            snippet: string;
            payload: { headers: Array<{ name: string; value: string }> };
          };
          const get = (name: string) => m.payload.headers.find(h => h.name === name)?.value ?? '';
          return {
            id: m.id,
            from: get('From'),
            subject: get('Subject'),
            date: get('Date'),
            snippet: m.snippet?.slice(0, 100),
          };
        } catch (e) {
          return { id: msg.id, error: String(e) };
        }
      })
    );

    return NextResponse.json({ ok: true, scopes: 'gmail.readonly + gmail.send', count: emails.length, emails });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
