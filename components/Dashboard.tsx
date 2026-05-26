'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Calendar, Target, BookOpen, Star, GraduationCap, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { DashboardData } from '@/lib/types';
import { getDefaultData } from '@/lib/defaults';
import { useAutoSave, SaveStatus } from '@/lib/useAutoSave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateData(raw: Record<string, any>): DashboardData {
  if (!raw?.weekly?.habits) return raw as DashboardData;
  return {
    ...raw,
    weekly: {
      ...raw.weekly,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      habits: raw.weekly.habits.map((h: Record<string, any>) => {
        if (h.completions !== undefined) return h;
        return {
          id: h.id,
          name: h.name,
          icon: h.icon ?? '🎯',
          color: h.color ?? '#6366f1',
          section: h.section ?? 'daily',
          weeklyGoal: h.weeklyGoal ?? 7,
          completions: h.days ? { [raw.weekly.weekOf]: h.days } : {},
        };
      }),
    },
  } as DashboardData;
}
import WeeklyView from './weekly/WeeklyView';
import QuarterlyView from './quarterly/QuarterlyView';
import BookTracker from './books/BookTracker';
import BucketList from './bucketlist/BucketList';
import SchoolProgress from './school/SchoolProgress';

const TABS = [
  { id: 'weekly', label: 'Week', icon: Calendar },
  { id: 'quarterly', label: 'Quarter', icon: Target },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'bucket', label: 'Bucket List', icon: Star },
  { id: 'school', label: 'School', icon: GraduationCap },
] as const;

type TabId = typeof TABS[number]['id'];

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      {status === 'saving' && <><Loader2 className="w-3 h-3 animate-spin text-slate-400" /><span className="text-slate-400">Saving…</span></>}
      {status === 'saved' && <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Saved</span></>}
      {status === 'error' && <><AlertCircle className="w-3 h-3 text-red-500" /><span className="text-red-600">Save failed</span></>}
    </span>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabId>('weekly');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => { setData(migrateData(d)); setLoading(false); })
      .catch(() => { setData(getDefaultData()); setLoading(false); });
  }, []);

  const saveData = useCallback(async (d: DashboardData) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    });
  }, []);

  const saveStatus = useAutoSave(data!, saveData, 1500);

  const update = useCallback(<K extends keyof DashboardData>(key: K, value: DashboardData[K]) => {
    setData(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <h1 className="font-bold text-lg tracking-tight">My Dashboard</h1>
              <nav className="flex gap-1">
                {TABS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        tab === t.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <SaveIndicator status={saveStatus} />
              {session?.user?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full ring-2 ring-slate-700" />
              )}
              <button
                onClick={() => signOut()}
                className="text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'weekly' && (
          <WeeklyView data={data.weekly} onChange={v => update('weekly', v)} />
        )}
        {tab === 'quarterly' && (
          <QuarterlyView data={data.quarterly} onChange={v => update('quarterly', v)} />
        )}
        {tab === 'books' && (
          <BookTracker books={data.books} onChange={v => update('books', v)} />
        )}
        {tab === 'bucket' && (
          <BucketList items={data.bucketList} onChange={v => update('bucketList', v)} />
        )}
        {tab === 'school' && (
          <SchoolProgress data={data.school} onChange={v => update('school', v)} />
        )}
      </main>
    </div>
  );
}
