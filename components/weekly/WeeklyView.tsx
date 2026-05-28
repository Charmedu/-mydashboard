'use client';

import { WeeklyData, MoodEntry } from '@/lib/types';
import TaskChecklist from './TaskChecklist';
import HabitTracker, { computeHabitScore } from './HabitTracker';
import WeeklyFocus from './WeeklyFocus';
import CalendarEvents from './CalendarEvents';
import MoodTracker from './MoodTracker';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: WeeklyData;
  mood: MoodEntry[];
  onChange: (data: WeeklyData) => void;
  onMoodChange: (entries: MoodEntry[]) => void;
}

function ScoreBadge({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) return null;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#d4b0a8' : '#b88880';
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="#ead8d0" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={radius} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-rd-text">{pct}%</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-rd-muted uppercase tracking-wider">{label}</div>
        <div className="text-sm font-bold" style={{ color }}>
          {pct >= 100 ? '🎉 Perfect!' : pct >= 80 ? 'On fire!' : pct >= 50 ? 'Keep going' : 'Just start'}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyView({ data, mood, onChange, onMoodChange }: Props) {
  const weekStart = parseISO(data.weekOf);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const habitPct = data.habits.length > 0 ? computeHabitScore(data.habits, data.weekOf) : null;
  const taskDone = data.tasks.filter(t => t.done).length;
  const taskPct = data.tasks.length > 0 ? Math.round((taskDone / data.tasks.length) * 100) : null;

  function navWeek(direction: 1 | -1) {
    const newStart = direction === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    onChange({ ...data, weekOf: format(newStart, 'yyyy-MM-dd'), tasks: [] });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-rd-text tracking-tight">Week View</h2>
          <p className="text-rd-muted text-sm mt-0.5">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Score badges */}
        {(habitPct !== null || taskPct !== null) && (
          <div className="flex items-center gap-6 rd-card px-5 py-3">
            <ScoreBadge label="Habits" pct={habitPct} />
            {habitPct !== null && taskPct !== null && (
              <div className="w-px h-10 bg-rd-border" />
            )}
            <ScoreBadge label="Tasks" pct={taskPct} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navWeek(-1)}
            className="p-2 rounded-lg hover:bg-rd-surface transition-colors duration-200"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-rd-text" />
          </button>
          <button
            onClick={() => onChange({
              ...data,
              weekOf: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
              tasks: [],
            })}
            className="rd-btn-ghost px-3 py-1.5 text-sm"
          >
            Today
          </button>
          <button
            onClick={() => navWeek(1)}
            className="p-2 rounded-lg hover:bg-rd-surface transition-colors duration-200"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-rd-text" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <WeeklyFocus
            focus={data.focus}
            goals={data.goals}
            onChange={(focus, goals) => onChange({ ...data, focus, goals })}
          />
          <CalendarEvents weekStart={data.weekOf} />
        </div>
        <div>
          <TaskChecklist
            tasks={data.tasks}
            onChange={tasks => onChange({ ...data, tasks })}
          />
        </div>
        <div className="lg:col-span-2">
          <HabitTracker
            habits={data.habits}
            weekStart={data.weekOf}
            onChange={habits => onChange({ ...data, habits })}
          />
        </div>
      </div>

      <div className="max-w-sm">
        <MoodTracker entries={mood} onChange={onMoodChange} />
      </div>
    </div>
  );
}
