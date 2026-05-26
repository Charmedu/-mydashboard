'use client';

import { useState } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import type { MoodEntry } from '@/lib/types';

interface Props {
  entries: MoodEntry[];
  onChange: (entries: MoodEntry[]) => void;
}

const EMOJIS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' };
const LABELS: Record<number, string> = { 1: 'Struggling', 2: 'Bit rough', 3: 'Getting by', 4: 'Pretty good', 5: 'Amazing!' };
const COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#94a3b8', 4: '#22c55e', 5: '#6366f1',
};

export default function MoodTracker({ entries, onChange }: Props) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayEntry = entries.find(e => e.date === today);

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === d);
    return { date: d, entry };
  });

  function logMood(score: number) {
    if (todayEntry) {
      onChange(entries.map(e => e.date === today ? { ...e, score } : e));
    } else {
      onChange([...entries, { id: crypto.randomUUID(), date: today, score }]);
    }
  }

  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const avg = recent.length > 0
    ? (recent.reduce((s, e) => s + e.score, 0) / recent.length).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Mood Tracker</h3>
        {avg && (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
            7-day avg: {avg}/5
          </span>
        )}
      </div>

      {/* Today's mood input */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">
          {todayEntry ? `Today: ${EMOJIS[todayEntry.score]} ${LABELS[todayEntry.score]} — click to update` : "How are you feeling today?"}
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              onClick={() => logMood(score)}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all ${
                todayEntry?.score === score
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl">{EMOJIS[score]}</span>
              <span className="text-[10px] text-slate-500">{score}</span>
            </button>
          ))}
        </div>
        {hoveredScore && (
          <p className="text-xs text-center text-slate-500 mt-1">{LABELS[hoveredScore]}</p>
        )}
      </div>

      {/* 14-day sparkline */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Last 14 days</p>
        <div className="flex items-end gap-0.5 h-10">
          {last14.map(({ date, entry }) => {
            const score = entry?.score;
            const h = score ? (score / 5) * 100 : 0;
            const color = score ? COLORS[score] : '#f1f5f9';
            const label = format(parseISO(date), 'MMM d');
            return (
              <div
                key={date}
                className="flex-1 rounded-sm transition-all group relative"
                style={{ height: `${score ? Math.max(20, h) : 8}%`, background: color }}
                title={`${label}: ${score ? `${score}/5 ${EMOJIS[score]}` : 'no entry'}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-slate-300">
          <span>{format(subDays(new Date(), 13), 'MMM d')}</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
