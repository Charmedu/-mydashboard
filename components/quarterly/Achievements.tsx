'use client';

import { useState } from 'react';
import { Achievement } from '@/lib/types';
import { Trophy, Plus, Trash2 } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { format } from 'date-fns';

interface Props {
  achievements: Achievement[];
  onChange: (achievements: Achievement[]) => void;
}

export default function Achievements({ achievements, onChange }: Props) {
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    onChange([{ id: nanoid(), text: text.trim(), date: new Date().toISOString() }, ...achievements]);
    setText('');
  }

  function remove(id: string) {
    onChange(achievements.filter(a => a.id !== id));
  }

  return (
    <div className="rd-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[3px] h-4 bg-rd-accent rounded-full flex-shrink-0" />
        <h3 className="font-semibold text-rd-text text-sm">Achievements</h3>
        {achievements.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            {achievements.length} logged
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="What did you accomplish?"
          className="rd-input flex-1 text-sm"
        />
        <button onClick={add} className="rd-btn px-3 py-2">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
        {achievements.length === 0 && (
          <p className="text-rd-muted text-sm text-center py-6">No wins logged yet — add your first!</p>
        )}
        {achievements.map(a => (
          <div key={a.id} className="flex items-start gap-3 group p-2.5 rounded-lg hover:bg-rd-bg transition-colors duration-150">
            <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-rd-text leading-snug">{a.text}</p>
              <p className="text-[11px] text-rd-muted mt-0.5">{format(new Date(a.date), 'MMM d, yyyy')}</p>
            </div>
            <button
              onClick={() => remove(a.id)}
              className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all mt-0.5 flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
