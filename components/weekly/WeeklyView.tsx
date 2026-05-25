'use client';

import { WeeklyData } from '@/lib/types';
import TaskChecklist from './TaskChecklist';
import HabitTracker from './HabitTracker';
import WeeklyFocus from './WeeklyFocus';
import CalendarEvents from './CalendarEvents';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  data: WeeklyData;
  onChange: (data: WeeklyData) => void;
}

export default function WeeklyView({ data, onChange }: Props) {
  const weekStart = parseISO(data.weekOf);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  function navWeek(direction: 1 | -1) {
    const newStart = direction === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    onChange({
      ...data,
      weekOf: format(newStart, 'yyyy-MM-dd'),
      tasks: [],
    });
  }

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Week View</h2>
          <p className="text-slate-500 text-sm">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navWeek(-1)} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => onChange({ ...data, weekOf: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), tasks: [] })}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            Today
          </button>
          <button onClick={() => navWeek(1)} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Focus + Calendar */}
        <div className="space-y-6">
          <WeeklyFocus
            focus={data.focus}
            goals={data.goals}
            onChange={(focus, goals) => onChange({ ...data, focus, goals })}
          />
          <CalendarEvents weekStart={data.weekOf} />
        </div>

        {/* Center: Tasks */}
        <div>
          <TaskChecklist
            tasks={data.tasks}
            onChange={tasks => onChange({ ...data, tasks })}
          />
        </div>

        {/* Right: Habits */}
        <div>
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
