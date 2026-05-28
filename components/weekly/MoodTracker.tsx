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
  1: '#ef4444', 2: '#f97316', 3: '#7a4f47', 4: '#10b981', 5: '#5c3e38',
};

export default function MoodTracker({ entries, onChange }: Props) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayEntry = entries.find(e => e.date === today);

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    return { date: d, entry: entries.find(e => e.date === d) };
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
    <div className="rd-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="rd-section-title text-sm">Mood Tracker</h3>
        {avg && (
          <span className="text-xs font-medium text-rd-muted bg-rd-bg border border-rd-border rounded-full px-2.5 py-1">
            7-day avg: {avg}/5
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs text-rd-muted mb-2">
          {todayEntry
            ? `Today: ${EMOJIS[todayEntry.score]} ${LABELS[todayEntry.score]} — click to update`
            : 'How are you feeling today?'}
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              onClick={() => logMood(score)}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all duration-200 ${
                todayEntry?.score === score
                  ? 'border-rd-accent bg-rd-bg'
                  : 'border-rd-border hover:border-rd-accent hover:bg-rd-bg'
              }`}
            >
              <span className="text-xl">{EMOJIS[score]}</span>
              <span className="text-[10px] text-rd-muted">{score}</span>
            </button>
          ))}
        </div>
        {hoveredScore && (
          <p className="text-xs text-center text-rd-muted mt-1.5">{LABELS[hoveredScore]}</p>
        )}
      </div>

      <div>
        <p className="text-xs text-rd-muted mb-1.5">Last 14 days</p>
        <div className="flex items-end gap-0.5 h-10">
          {last14.map(({ date, entry }) => {
            const score = entry?.score;
            const color = score ? COLORS[score] : '#ead8d0';
            return (
              <div
                key={date}
                className="flex-1 rounded-sm transition-all"
                style={{ height: `${score ? Math.max(20, (score / 5) * 100) : 8}%`, background: color }}
                title={`${format(parseISO(date), 'MMM d')}: ${score ? `${score}/5 ${EMOJIS[score]}` : 'no entry'}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-rd-muted">
          <span>{format(subDays(new Date(), 13), 'MMM d')}</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
