import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { initDb, loadUserData, saveUserData } from '@/lib/db';
import { getDefaultData } from '@/lib/defaults';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initDb();
    const data = await loadUserData(session.user.email);
    return NextResponse.json(data ?? getDefaultData());
  } catch (err) {
    console.error('Failed to load data:', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initDb();
    const data = await req.json();
    data.lastSaved = new Date().toISOString();
    await saveUserData(session.user.email, data);
    return NextResponse.json({ ok: true, lastSaved: data.lastSaved });
  } catch (err) {
    console.error('Failed to save data:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
