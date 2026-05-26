'use client';

import { useRef, useState } from 'react';
import { Habit } from '@/lib/types';
import { Plus, Trash2, ChevronUp } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { format, addDays, parseISO } from 'date-fns';
import { celebrate } from '@/lib/celebrate';

interface Props {
  habits: Habit[];
  weekStart: string;
  onChange: (habits: Habit[]) => void;
}

const COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#14b8a6', '#64748b',
];

const ICONS = [
  '💪', '🏃', '💧', '📚', '🧘', '😴', '🥗', '🎯',
  '💊', '🧹', '🐕', '🎨', '✍️', '🎸', '💰', '📝',
  '🍎', '🚶', '🌿', '🏊', '☀️', '🧠', '🎭', '🧴',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays(habit: Habit, weekOf: string): boolean[] {
  return habit.completions[weekOf] ?? Array(7).fill(false);
}

export function computeHabitScore(habits: Habit[], weekOf: string): number {
  const totalGoal = habits.reduce((s, h) => s + h.weeklyGoal, 0);
  if (!totalGoal) return 0;
  const totalDone = habits.reduce((s, h) => {
    const checked = getWeekDays(h, weekOf).filter(Boolean).length;
    return s + Math.min(checked, h.weeklyGoal);
  }, 0);
  return Math.round((totalDone / totalGoal) * 100);
}

export default function HabitTracker({ habits, weekStart, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(ICONS[0]);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newSection, setNewSection] = useState<'daily' | 'other'>('daily');
  const [newGoal, setNewGoal] = useState(7);
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), 'd')
  );

  const daily = habits.filter(h => h.section === 'daily');
  const other = habits.filter(h => h.section === 'other');

  function addHabit() {
    if (!newName.trim()) return;
    onChange([...habits, {
      id: nanoid(),
      name: newName.trim(),
      icon: newIcon,
      color: newColor,
      section: newSection,
      weeklyGoal: newGoal,
      completions: {},
    }]);
    setNewName('');
    setNewIcon(ICONS[0]);
    setNewColor(COLORS[0]);
    setNewGoal(7);
    setShowForm(false);
  }

  function toggleDay(habitId: string, dayIdx: number) {
    const habit = habits.find(h => h.id === habitId)!;
    const days = getWeekDays(habit, weekStart);
    const wasOff = !days[dayIdx];
    const newDays = days.map((d, i) => (i === dayIdx ? !d : d));
    onChange(habits.map(h =>
      h.id === habitId
        ? { ...h, completions: { ...h.completions, [weekStart]: newDays } }
        : h
    ));
    if (wasOff) {
      celebrate(cellRefs.current[`${habitId}-${dayIdx}`]);
    }
  }

  function removeHabit(id: string) {
    onChange(habits.filter(h => h.id !== id));
  }

  function renderSection(sectionHabits: Habit[], label: string) {
    if (!sectionHabits.length) return null;
    return (
      <>
        <tr>
          <td colSpan={10} className="pt-3 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
          </td>
        </tr>
        {sectionHabits.map(habit => {
          const days = getWeekDays(habit, weekStart);
          const checked = days.filter(Boolean).length;
          const goalMet = checked >= habit.weeklyGoal;
          return (
            <tr key={habit.id} className="group">
              <td className="pr-3 py-1.5 min-w-[110px]">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none select-none">{habit.icon}</span>
                  <div>
                    <div
                      className="text-xs font-semibold truncate max-w-[72px] leading-tight"
                      style={{ color: habit.color }}
                    >
                      {habit.name}
                    </div>
                    <div className={`text-[10px] font-bold mt-0.5 ${goalMet ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {checked}/{habit.weeklyGoal}d
                    </div>
                  </div>
                </div>
              </td>
              {days.map((done, i) => (
                <td key={i} className="text-center px-0.5 py-1.5">
                  <button
                    ref={el => { cellRefs.current[`${habit.id}-${i}`] = el; }}
                    onClick={() => toggleDay(habit.id, i)}
                    className="w-7 h-7 rounded-lg border-2 mx-auto flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={done
                      ? { background: habit.color, borderColor: habit.color }
                      : { borderColor: '#e2e8f0', background: 'transparent' }
                    }
                    aria-label={`${habit.name} ${DAYS[i]}`}
                  >
                    {done && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </button>
                </td>
              ))}
              <td className="pl-1.5 py-1.5">
                <button
                  onClick={() => removeHabit(habit.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Habits</h3>

      {habits.length > 0 ? (
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-slate-500 font-medium pb-2 pr-3">Habit</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="text-center font-medium pb-2 px-0.5 min-w-[2rem]">
                    <div className="text-slate-500 text-[11px]">{d}</div>
                    <div className="text-slate-300 text-[10px] font-normal">{weekDates[i]}</div>
                  </th>
                ))}
                <th className="w-5" />
              </tr>
            </thead>
            <tbody>
              {renderSection(daily, 'Daily')}
              {renderSection(other, 'Other')}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-400 text-sm text-center py-4 mb-2">No habits yet.</p>
      )}

      <div className="border-t border-slate-100 pt-3">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add habit'}
        </button>

        {showForm && (
          <div className="mt-3 space-y-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
              placeholder="Habit name…"
              autoFocus
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400"
            />

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Icon</div>
              <div className="flex flex-wrap gap-1">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all hover:scale-110 ${
                      newIcon === icon ? 'ring-2 ring-indigo-400 bg-indigo-50 scale-110' : 'hover:bg-slate-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Color</div>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: newColor === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Section</div>
                <div className="flex gap-1.5">
                  {(['daily', 'other'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setNewSection(s)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-semibold transition-colors capitalize ${
                        newSection === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Goal — {newGoal}/7 days
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={newGoal}
                  onChange={e => setNewGoal(Number(e.target.value))}
                  className="w-full accent-indigo-600 mt-1"
                />
              </div>
            </div>

            <button
              onClick={addHabit}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Add Habit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
