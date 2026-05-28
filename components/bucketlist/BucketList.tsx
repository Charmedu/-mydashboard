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

const CAT_CONFIG: Record<BucketCategory, { accent: string; bg: string; border: string; icon: string }> = {
  Travel:     { accent: '#0ea5e9', bg: 'bg-sky-50',     border: 'border-sky-200',     icon: '✈️' },
  Experience: { accent: '#5c3e38', bg: 'bg-rd-bg',      border: 'border-rd-border',   icon: '🎯' },
  Career:     { accent: '#d97706', bg: 'bg-amber-50',   border: 'border-amber-200',   icon: '💼' },
  Personal:   { accent: '#d4b0a8', bg: 'bg-rd-bg',      border: 'border-rd-border',   icon: '✨' },
  Health:     { accent: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '💪' },
  Creative:   { accent: '#f97316', bg: 'bg-orange-50',  border: 'border-orange-200',  icon: '🎨' },
  Financial:  { accent: '#0d9488', bg: 'bg-teal-50',    border: 'border-teal-200',    icon: '💰' },
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
    onChange([...items, { id: nanoid(), text: newText.trim(), category: newCategory, done: false, targetDate: newDate || undefined }]);
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
          <h2 className="font-display text-2xl font-bold text-rd-text tracking-tight">Bucket List</h2>
          <p className="text-rd-muted text-sm">{done}/{items.length} completed · {pct}%</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rd-btn text-sm px-4 py-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="rd-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-rd-text">Overall Progress</span>
            <span className="text-sm font-bold text-rd-text">{pct}%</span>
          </div>
          <div className="h-2.5 bg-rd-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #5c3e38, #d4b0a8)' }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rd-card p-5 space-y-3">
          <h3 className="font-semibold text-rd-text">New Bucket List Item</h3>
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="What do you want to do or achieve?"
            className="rd-input"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-rd-muted mb-1 block">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as BucketCategory)}
                className="rd-input"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_CONFIG[c].icon} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-rd-muted mb-1 block">Target Date (optional)</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="rd-input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="rd-btn flex-1 py-2 text-sm justify-center">Add to List</button>
            <button onClick={() => setShowForm(false)} className="rd-btn-ghost px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          if (catItems.length === 0) return null;
          const cfg = CAT_CONFIG[cat];
          const isCollapsed = collapsed.has(cat);
          const catDone = catItems.filter(i => i.done).length;

          return (
            <div key={cat} className={`border rounded-[10px] overflow-hidden ${cfg.bg} ${cfg.border}`}>
              <button
                className="w-full flex items-center gap-3 px-5 py-3 transition-colors duration-150"
                onClick={() => toggleCollapse(cat)}
              >
                <span className="text-lg">{cfg.icon}</span>
                <h3 className="font-semibold flex-1 text-left text-rd-text text-sm">{cat}</h3>
                <span className="text-xs text-rd-muted">{catDone}/{catItems.length}</span>
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-rd-muted" />
                  : <ChevronUp className="w-4 h-4 text-rd-muted" />}
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-4 space-y-2">
                  {catItems.map(item => (
                    <div key={item.id} className="group bg-white bg-opacity-70 rounded-lg px-3 py-2.5 border border-white/80 shadow-sm">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleDone(item.id)}
                          className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                            item.done
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-rd-border hover:border-emerald-400'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3 text-white check-animate" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.done ? 'line-through text-rd-muted' : 'text-rd-text'}`}>
                            {item.text}
                          </p>
                          {item.targetDate && (
                            <p className="text-xs text-rd-muted mt-0.5">Target: {item.targetDate}</p>
                          )}
                          {editNotes === item.id ? (
                            <textarea
                              defaultValue={item.notes}
                              onBlur={e => { updateNotes(item.id, e.target.value); setEditNotes(null); }}
                              autoFocus
                              rows={2}
                              className="mt-1 rd-input text-xs resize-none"
                            />
                          ) : item.notes ? (
                            <button onClick={() => setEditNotes(item.id)} className="text-xs text-rd-muted hover:text-rd-text mt-0.5 text-left transition-colors">
                              {item.notes}
                            </button>
                          ) : (
                            <button onClick={() => setEditNotes(item.id)} className="text-xs text-rd-accent hover:text-rd-text mt-0.5 transition-colors">
                              + Add notes
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all flex-shrink-0"
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
          <div className="text-center py-16 text-rd-muted">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Your bucket list is empty. Start adding things you want to do!</p>
          </div>
        )}
      </div>
    </div>
  );
}
