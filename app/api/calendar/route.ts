import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const s = session as unknown as Record<string, unknown>;
  if (s.error === 'RefreshAccessTokenError') {
    return NextResponse.json({ error: 'RefreshAccessTokenError' }, { status: 401 });
  }

  const accessToken = s.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: 'No calendar access' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get('timeMin') ?? new Date().toISOString();
  const timeMax = searchParams.get('timeMax') ?? new Date(Date.now() + 7 * 86400000).toISOString();

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '50');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Calendar fetch failed' }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json.items ?? []);
  } catch (err) {
    console.error('Calendar error:', err);
    return NextResponse.json({ error: 'Calendar error' }, { status: 500 });
  }
}
