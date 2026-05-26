'use client';

import { useState } from 'react';
import { ParkingItem } from '@/lib/types';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface Props {
  items: ParkingItem[];
  onChange: (items: ParkingItem[]) => void;
}

export default function ParkingLot({ items, onChange }: Props) {
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    onChange([
      ...items,
      { id: nanoid(), text: text.trim(), addedAt: new Date().toISOString() },
    ]);
    setText('');
  }

  function remove(id: string) {
    onChange(items.filter(p => p.id !== id));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="w-4 h-4 text-violet-500" />
        <h3 className="font-semibold text-slate-800">Parking Lot</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-4">Ideas and backlog &mdash; not this quarter&apos;s priority</p>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Park an idea for later…"
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-700 placeholder:text-slate-400"
        />
        <button
          onClick={add}
          className="px-3 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin">
        {items.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-6">
            Nothing parked yet &mdash; ideas live here.
          </p>
        )}
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 group p-2.5 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
            <p className="flex-1 text-sm text-slate-700">{item.text}</p>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
