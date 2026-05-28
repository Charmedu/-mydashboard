'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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
    <div className="rd-card p-5">
      <h3 className="rd-section-title text-sm">This Week&apos;s Focus</h3>

      <textarea
        value={focus}
        onChange={e => onChange(e.target.value, goals)}
        placeholder="What is your main theme this week?"
        rows={3}
        className="rd-input text-sm resize-none mb-4"
      />

      <div className="space-y-1 mb-3">
        <p className="text-[10px] font-bold text-rd-muted uppercase tracking-wider mb-2">Weekly Goals</p>
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <span className="w-1.5 h-1.5 rounded-full bg-rd-accent flex-shrink-0" />
            <span className="flex-1 text-sm text-rd-text">{g}</span>
            <button
              onClick={() => removeGoal(i)}
              className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-rd-muted text-xs">No goals added yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newGoal}
          onChange={e => setNewGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGoal()}
          placeholder="Add a goal…"
          className="rd-input flex-1 text-sm"
        />
        <button
          onClick={addGoal}
          className="rd-btn px-3 py-2"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
