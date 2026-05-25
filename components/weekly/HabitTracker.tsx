'use client';

import { useState } from 'react';
import { Habit } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { format, parseISO, addDays } from 'date-fns';

interface Props {
  habits: Habit[];
  weekStart: string;
  onChange: (habits: Habit[]) => void;
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitTracker({ habits, weekStart, onChange }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), 'MMM d')
  );

  function addHabit() {
    if (!newName.trim()) return;
    onChange([...habits, { id: nanoid(), name: newName.trim(), days: [false,false,false,false,false,false,false], color: newColor }]);
    setNewName('');
  }

  function toggleDay(habitId: string, dayIdx: number) {
    onChange(habits.map(h =>
      h.id === habitId
        ? { ...h, days: h.days.map((d, i) => i === dayIdx ? !d : d) }
        : h
    ));
  }

  function removeHabit(id: string) {
    onChange(habits.filter(h => h.id !== id));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Habit Tracker</h3>

      {habits.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-slate-500 font-medium pb-2 pr-2">Habit</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="text-center text-slate-400 font-medium pb-2 px-0.5 min-w-[2rem]">
                    <div>{d}</div>
                    <div className="text-slate-300 font-normal">{weekDates[i]?.split(' ')[1]}</div>
                  </th>
                ))}
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              {habits.map(habit => {
                const completed = habit.days.filter(Boolean).length;
                return (
                  <tr key={habit.id} className="group">
                    <td className="pr-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: habit.color }} />
                        <span className="text-slate-700 font-medium truncate max-w-[80px]">{habit.name}</span>
                        <span className="text-slate-400 ml-auto">{completed}/7</span>
                      </div>
                    </td>
                    {habit.days.map((done, i) => (
                      <td key={i} className="text-center px-0.5 py-1.5">
                        <button
                          onClick={() => toggleDay(habit.id, i)}
                          className="w-7 h-7 rounded-md border-2 mx-auto flex items-center justify-center transition-all hover:scale-110"
                          style={done
                            ? { background: habit.color, borderColor: habit.color }
                            : { borderColor: '#e2e8f0' }
                          }
                        >
                          {done && (
                            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="pl-2">
                      <button
                        onClick={() => removeHabit(habit.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {habits.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-3 mb-4">No habits tracked yet.</p>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addHabit()}
          placeholder="New habit name…"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400"
        />
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
              />
            ))}
          </div>
          <button
            onClick={addHabit}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
