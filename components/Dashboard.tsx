'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signOutAction } from '@/app/actions/auth';
import { Calendar, Target, BookOpen, Star, GraduationCap, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { DashboardData } from '@/lib/types';
import { getDefaultData } from '@/lib/defaults';
import { useAutoSave, SaveStatus } from '@/lib/useAutoSave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateData(raw: Record<string, any>): DashboardData {
  if (raw?.weekly?.habits) {
    raw = {
      ...raw,
      weekly: {
        ...raw.weekly,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        habits: raw.weekly.habits.map((h: Record<string, any>) => {
          if (h.completions !== undefined) return h;
          return {
            id: h.id, name: h.name, icon: h.icon ?? '🎯',
            color: h.color ?? '#d4b0a8', section: h.section ?? 'daily',
            weeklyGoal: h.weeklyGoal ?? 7,
            completions: h.days ? { [raw.weekly.weekOf]: h.days } : {},
          };
        }),
      },
    };
  }

  if (raw?.quarterly) {
    const q = raw.quarterly;
    if (typeof q.quarter === 'string') {
      raw = {
        ...raw,
        quarterly: {
          [q.quarter]: { ...q, achievements: q.achievements ?? [], parkingLot: q.parkingLot ?? [] },
        },
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const migrated: Record<string, any> = {};
      for (const [key, val] of Object.entries(q)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = val as Record<string, any>;
        migrated[key] = { ...v, achievements: v.achievements ?? [], parkingLot: v.parkingLot ?? [] };
      }
      raw = { ...raw, quarterly: migrated };
    }
  }

  raw = {
    mood: [],
    journal: [],
    expenses: [],
    reminders: [],
    savedArticles: [],
    universityEmails: [],
    ...raw,
  };

  return raw as DashboardData;
}

import WeeklyView from './weekly/WeeklyView';
import QuarterlyView from './quarterly/QuarterlyView';
import BookTracker from './books/BookTracker';
import BucketList from './bucketlist/BucketList';
import SchoolProgress from './school/SchoolProgress';

const TABS = [
  { id: 'weekly',    label: 'Week',        icon: Calendar },
  { id: 'quarterly', label: 'Quarter',     icon: Target },
  { id: 'books',     label: 'Books',       icon: BookOpen },
  { id: 'bucket',    label: 'Bucket List', icon: Star },
  { id: 'school',    label: 'School',      icon: GraduationCap },
] as const;

type TabId = typeof TABS[number]['id'];

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      {status === 'saving' && (
        <><Loader2 className="w-3 h-3 animate-spin text-rd-accent" /><span className="text-rd-accent">Saving…</span></>
      )}
      {status === 'saved' && (
        <><CheckCircle className="w-3 h-3 text-emerald-400" /><span className="text-emerald-300 text-xs">Saved</span></>
      )}
      {status === 'error' && (
        <><AlertCircle className="w-3 h-3 text-red-400" /><span className="text-red-300 text-xs">Save failed</span></>
      )}
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
      <div className="min-h-screen flex items-center justify-center bg-rd-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-7 h-7 animate-spin text-rd-accent" />
          <p className="text-rd-muted text-sm">Loading your command center…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rd-bg">
      {/* Header */}
      <header className="bg-rd-nav sticky top-0 z-40 shadow-[0_2px_16px_rgba(92,62,56,0.18)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">

            {/* Title + nav */}
            <div className="flex items-center gap-6">
              <h1 className="font-display font-bold text-lg tracking-wide text-rd-bg whitespace-nowrap">
                Char&apos;s Executive Suite
              </h1>
              <nav className="flex gap-0.5">
                {TABS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        tab === t.id
                          ? 'bg-[#4a3230] text-rd-bg'
                          : 'text-rd-accent hover:text-rd-bg hover:bg-[#4a3230]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <SaveIndicator status={saveStatus} />
              {session?.user?.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="w-7 h-7 rounded-full ring-2 ring-rd-accent ring-offset-1 ring-offset-rd-nav"
                />
              )}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-rd-accent hover:text-rd-bg transition-colors duration-200"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-7">
        {tab === 'weekly' && (
          <WeeklyView
            data={data.weekly}
            mood={data.mood ?? []}
            onChange={v => update('weekly', v)}
            onMoodChange={v => update('mood', v)}
          />
        )}
        {tab === 'quarterly' && (
          <QuarterlyView
            data={data.quarterly}
            expenses={data.expenses ?? []}
            onChange={v => update('quarterly', v)}
          />
        )}
        {tab === 'books' && (
          <BookTracker books={data.books} onChange={v => update('books', v)} />
        )}
        {tab === 'bucket' && (
          <BucketList items={data.bucketList} onChange={v => update('bucketList', v)} />
        )}
        {tab === 'school' && (
          <SchoolProgress
            data={data.school}
            universityEmails={data.universityEmails ?? []}
            onChange={v => update('school', v)}
          />
        )}
      </main>
    </div>
  );
}
