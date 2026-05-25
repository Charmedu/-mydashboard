'use client';

import { useState } from 'react';
import { Goal } from '@/lib/types';
import { Plus, Trash2, Check } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface GoalsMap {
  finance: Goal[];
  health: Goal[];
  school: Goal[];
  personal: Goal[];
}

interface Props {
  goals: GoalsMap;
  onChange: (goals: GoalsMap) => void;
}

const CATEGORIES: { key: keyof GoalsMap; label: string; color: string; bg: string }[] = [
  { key: 'finance',  label: 'Finance',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'health',   label: 'Health',   color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
  { key: 'school',   label: 'School',   color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  { key: 'personal', label: 'Personal', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
];

function GoalSection({ category, goals, onUpdate }: {
  category: typeof CATEGORIES[0];
  goals: Goal[];
  onUpdate: (goals: Goal[]) => void;
}) {
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    onUpdate([...goals, { id: nanoid(), text: text.trim(), done: false }]);
    setText('');
  }

  function toggle(id: string) {
    onUpdate(goals.map(g => g.id === id ? { ...g, done: !g.done } : g));
  }

  function remove(id: string) {
    onUpdate(goals.filter(g => g.id !== id));
  }

  const done = goals.filter(g => g.done).length;

  return (
    <div className={`border rounded-xl p-4 ${category.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold ${category.color}`}>{category.label}</h4>
        <span className="text-xs text-slate-500">{done}/{goals.length}</span>
      </div>

      <div className="space-y-1.5 mb-3 min-h-[40px]">
        {goals.map(goal => (
          <div key={goal.id} className="flex items-center gap-2 group">
            <button
              onClick={() => toggle(goal.id)}
              className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                goal.done ? 'bg-slate-600 border-slate-600' : 'border-slate-400 hover:border-slate-600'
              }`}
            >
              {goal.done && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
            <span className={`flex-1 text-sm ${goal.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {goal.text}
            </span>
            <button
              onClick={() => remove(goal.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && <p className="text-slate-400 text-xs">No goals yet.</p>}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add goal…"
          className="flex-1 text-sm border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400"
        />
        <button
          onClick={add}
          className="p-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function QuarterlyGoals({ goals, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Quarterly Goals</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map(cat => (
          <GoalSection
            key={cat.key}
            category={cat}
            goals={goals[cat.key]}
            onUpdate={updated => onChange({ ...goals, [cat.key]: updated })}
          />
        ))}
      </div>
    </div>
  );
}
