'use client';

import { WeeklyData } from '@/lib/types';
import TaskChecklist from './TaskChecklist';
import HabitTracker, { computeHabitScore } from './HabitTracker';
import WeeklyFocus from './WeeklyFocus';
import CalendarEvents from './CalendarEvents';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: WeeklyData;
  onChange: (data: WeeklyData) => void;
}

function ScoreBadge({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) return null;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#94a3b8';
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={radius} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-700">{pct}%</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-bold" style={{ color }}>
          {pct >= 100 ? '🎉 Perfect!' : pct >= 80 ? 'On fire!' : pct >= 50 ? 'Keep going' : 'Just start'}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyView({ data, onChange }: Props) {
  const weekStart = parseISO(data.weekOf);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const habitPct = data.habits.length > 0
    ? computeHabitScore(data.habits, data.weekOf)
    : null;

  const taskDone = data.tasks.filter(t => t.done).length;
  const taskPct = data.tasks.length > 0
    ? Math.round((taskDone / data.tasks.length) * 100)
    : null;

  function navWeek(direction: 1 | -1) {
    const newStart = direction === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    onChange({ ...data, weekOf: format(newStart, 'yyyy-MM-dd'), tasks: [] });
  }

  return (
    <div className="space-y-6">
      {/* Header: nav + scores */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Week View</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Scores */}
        {(habitPct !== null || taskPct !== null) && (
          <div className="flex items-center gap-6 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3">
            <ScoreBadge label="Habits" pct={habitPct} />
            {habitPct !== null && taskPct !== null && (
              <div className="w-px h-10 bg-slate-100" />
            )}
            <ScoreBadge label="Tasks" pct={taskPct} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navWeek(-1)}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => onChange({
              ...data,
              weekOf: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
              tasks: [],
            })}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navWeek(1)}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Content grid: Focus+Calendar | Tasks | Habits (wider) */}
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
    </div>
  );
}
