'use client';

import { useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';

interface Props {
  focus: string;
  goals: string[];
  onChange: (focus: string, goals: string[]) => void;
}

export default function WeeklyFocus({ focus, goals, onChange }: Props) {
  const [newGoal, setNewGoal] = useState('');

  function addGoal() {
    if (!newGoal.trim()) return;
    onChange(focus, [...goals, newGoal.trim()]);
    setNewGoal('');
  }

  function removeGoal(idx: number) {
    onChange(focus, goals.filter((_, i) => i !== idx));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-indigo-500" />
        <h3 className="font-semibold text-slate-800">This Week&apos;s Focus</h3>
      </div>

      <textarea
        value={focus}
        onChange={e => onChange(e.target.value, goals)}
        placeholder="What is your main focus or theme this week?"
        rows={3}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400 resize-none mb-4"
      />

      <div className="space-y-1 mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Weekly Goals</p>
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            <span className="flex-1 text-sm text-slate-700">{g}</span>
            <button
              onClick={() => removeGoal(i)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-slate-400 text-xs">No goals added yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newGoal}
          onChange={e => setNewGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGoal()}
          placeholder="Add a goal…"
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400"
        />
        <button
          onClick={addGoal}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
