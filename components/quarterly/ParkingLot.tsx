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
    onChange([...items, { id: nanoid(), text: text.trim(), addedAt: new Date().toISOString() }]);
    setText('');
  }

  function remove(id: string) {
    onChange(items.filter(p => p.id !== id));
  }

  return (
    <div className="rd-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-[3px] h-4 bg-rd-accent rounded-full flex-shrink-0" />
        <h3 className="font-semibold text-rd-text text-sm">Parking Lot</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-rd-muted bg-rd-bg border border-rd-border px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      <p className="text-xs text-rd-muted mb-4 pl-[13px]">Ideas &amp; backlog — not this quarter&apos;s priority</p>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Park an idea for later…"
          className="rd-input flex-1 text-sm"
        />
        <button onClick={add} className="rd-btn px-3 py-2">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin">
        {items.length === 0 && (
          <p className="text-rd-muted text-sm text-center py-6">Nothing parked yet — ideas live here.</p>
        )}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2.5 group p-2.5 rounded-lg hover:bg-rd-bg transition-colors duration-150">
            <Lightbulb className="w-3.5 h-3.5 text-rd-accent flex-shrink-0" />
            <p className="flex-1 text-sm text-rd-text">{item.text}</p>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
