'use client';

import { useState } from 'react';
import { Goal } from '@/lib/types';
import { Plus, Trash2, Check } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { celebrate } from '@/lib/celebrate';

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

const CATEGORIES: { key: keyof GoalsMap; label: string; accent: string; bg: string }[] = [
  { key: 'finance',  label: 'Finance',  accent: '#10b981', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'health',   label: 'Health',   accent: '#d4b0a8', bg: 'bg-rd-bg border-rd-border' },
  { key: 'school',   label: 'School',   accent: '#5c3e38', bg: 'bg-rd-bg border-rd-border' },
  { key: 'personal', label: 'Personal', accent: '#7a4f47', bg: 'bg-rd-bg border-rd-border' },
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

  function toggle(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    const completing = !goals.find(g => g.id === id)?.done;
    onUpdate(goals.map(g => g.id === id ? { ...g, done: !g.done } : g));
    if (completing) celebrate(e.currentTarget);
  }

  function remove(id: string) {
    onUpdate(goals.filter(g => g.id !== id));
  }

  const done = goals.filter(g => g.done).length;

  return (
    <div className={`border rounded-[10px] p-4 ${category.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-rd-text text-sm" style={{ borderLeft: `3px solid ${category.accent}`, paddingLeft: '0.5rem' }}>
          {category.label}
        </h4>
        <span className="text-xs text-rd-muted">{done}/{goals.length}</span>
      </div>

      <div className="space-y-1.5 mb-3 min-h-[40px]">
        {goals.map(goal => (
          <div key={goal.id} className="flex items-center gap-2 group">
            <button
              onClick={e => toggle(goal.id, e)}
              className="w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
              style={goal.done
                ? { background: category.accent, borderColor: category.accent }
                : { borderColor: '#ead8d0' }
              }
            >
              {goal.done && <Check className="w-2.5 h-2.5 text-white check-animate" />}
            </button>
            <span className={`flex-1 text-sm ${goal.done ? 'line-through text-rd-muted' : 'text-rd-text'}`}>
              {goal.text}
            </span>
            <button
              onClick={() => remove(goal.id)}
              className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && <p className="text-rd-muted text-xs">No goals yet.</p>}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add goal…"
          className="rd-input flex-1 text-sm py-1.5"
        />
        <button
          onClick={add}
          className="rd-btn p-1.5"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function QuarterlyGoals({ goals, onChange }: Props) {
  return (
    <div className="rd-card p-5">
      <h3 className="rd-section-title text-sm">Quarterly Goals</h3>
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
