'use client';

import { useState } from 'react';
import { BucketItem, BucketCategory } from '@/lib/types';
import { Plus, Trash2, Check, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface Props {
  items: BucketItem[];
  onChange: (items: BucketItem[]) => void;
}

const CATEGORIES: BucketCategory[] = ['Travel', 'Experience', 'Career', 'Personal', 'Health', 'Creative', 'Financial'];

const CAT_CONFIG: Record<BucketCategory, { color: string; bg: string; icon: string }> = {
  Travel:     { color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200',      icon: '✈️' },
  Experience: { color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: '🎯' },
  Career:     { color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: '💼' },
  Personal:   { color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-200',     icon: '✨' },
  Health:     { color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',icon: '💪' },
  Creative:   { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '🎨' },
  Financial:  { color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200',     icon: '💰' },
};

export default function BucketList({ items, onChange }: Props) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<BucketCategory>('Travel');
  const [newDate, setNewDate] = useState('');
  const [collapsed, setCollapsed] = useState<Set<BucketCategory>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editNotes, setEditNotes] = useState<string | null>(null);

  function addItem() {
    if (!newText.trim()) return;
    onChange([...items, {
      id: nanoid(),
      text: newText.trim(),
      category: newCategory,
      done: false,
      targetDate: newDate || undefined,
    }]);
    setNewText('');
    setNewDate('');
    setShowForm(false);
  }

  function toggleDone(id: string) {
    onChange(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  }

  function updateNotes(id: string, notes: string) {
    onChange(items.map(i => i.id === id ? { ...i, notes } : i));
  }

  function removeItem(id: string) {
    onChange(items.filter(i => i.id !== id));
  }

  function toggleCollapse(cat: BucketCategory) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  }

  const done = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bucket List</h2>
          <p className="text-slate-500 text-sm">{done}/{items.length} completed · {pct}%</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Progress</span>
            <span className="text-sm font-bold text-indigo-600">{pct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <h3 className="font-semibold text-slate-800">New Bucket List Item</h3>
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="What do you want to do or achieve?"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as BucketCategory)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CAT_CONFIG[c].icon} {c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Target Date (optional)</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-600"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors">
              Add to List
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          if (catItems.length === 0) return null;
          const cfg = CAT_CONFIG[cat];
          const isCollapsed = collapsed.has(cat);
          const catDone = catItems.filter(i => i.done).length;

          return (
            <div key={cat} className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
              <button
                className="w-full flex items-center gap-3 px-5 py-3"
                onClick={() => toggleCollapse(cat)}
              >
                <span className="text-lg">{cfg.icon}</span>
                <h3 className={`font-semibold flex-1 text-left ${cfg.color}`}>{cat}</h3>
                <span className="text-xs text-slate-500">{catDone}/{catItems.length}</span>
                {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-4 space-y-2">
                  {catItems.map(item => (
                    <div key={item.id} className="group bg-white bg-opacity-60 rounded-lg px-3 py-2.5 border border-white">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleDone(item.id)}
                          className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {item.text}
                          </p>
                          {item.targetDate && (
                            <p className="text-xs text-slate-400 mt-0.5">Target: {item.targetDate}</p>
                          )}
                          {editNotes === item.id ? (
                            <textarea
                              defaultValue={item.notes}
                              onBlur={e => { updateNotes(item.id, e.target.value); setEditNotes(null); }}
                              autoFocus
                              rows={2}
                              className="mt-1 w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none bg-white"
                            />
                          ) : item.notes ? (
                            <button onClick={() => setEditNotes(item.id)} className="text-xs text-slate-400 hover:text-slate-600 mt-0.5 text-left">
                              {item.notes}
                            </button>
                          ) : (
                            <button onClick={() => setEditNotes(item.id)} className="text-xs text-slate-300 hover:text-slate-500 mt-0.5">
                              + Add notes
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Your bucket list is empty. Start adding things you want to do!</p>
          </div>
        )}
      </div>
    </div>
  );
}
