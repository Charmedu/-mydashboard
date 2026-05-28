'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { Plus, Trash2, Check } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { celebrate } from '@/lib/celebrate';

interface Props {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

const CATEGORIES = ['Work', 'Personal', 'Health', 'School', 'Finance', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  Work:     '#5c3e38',
  Personal: '#d4b0a8',
  Health:   '#10b981',
  School:   '#7a4f47',
  Finance:  '#4a3230',
  Other:    '#ead8d0',
};

export default function TaskChecklist({ tasks, onChange }: Props) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');

  function addTask() {
    if (!newText.trim()) return;
    onChange([...tasks, { id: nanoid(), text: newText.trim(), done: false, category: newCategory }]);
    setNewText('');
  }

  function toggle(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    const task = tasks.find(t => t.id === id)!;
    const completing = !task.done;
    onChange(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    if (completing) celebrate(e.currentTarget);
  }

  function remove(id: string) {
    onChange(tasks.filter(t => t.id !== id));
  }

  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="rd-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="rd-section-title text-sm">Tasks</h3>
        <span className="text-xs text-rd-muted font-medium">{done}/{tasks.length}</span>
      </div>

      {tasks.length > 0 && (
        <div className="mb-4">
          <div className="h-1 bg-rd-border rounded-full overflow-hidden">
            <div
              className="h-full bg-rd-accent rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-rd-muted mt-1 text-right font-medium">{pct}% complete</p>
        </div>
      )}

      <div className="space-y-0.5 mb-4 flex-1 overflow-y-auto scrollbar-thin pr-1 max-h-72">
        {tasks.length === 0 && (
          <p className="text-rd-muted text-sm text-center py-6">No tasks yet — add one below.</p>
        )}
        {tasks.map(task => {
          const catColor = CATEGORY_COLORS[task.category ?? 'Other'] ?? '#d4b0a8';
          return (
            <div
              key={task.id}
              className="flex items-center gap-2.5 group py-1.5 rounded-lg px-2 hover:bg-rd-bg transition-colors duration-150"
            >
              <button
                onClick={e => toggle(task.id, e)}
                className="w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
                style={task.done
                  ? { background: catColor, borderColor: catColor }
                  : { borderColor: '#ead8d0' }
                }
              >
                {task.done && <Check className="w-3 h-3 text-white check-animate" />}
              </button>
              <span className={`flex-1 text-sm leading-snug ${task.done ? 'line-through text-rd-muted' : 'text-rd-text'}`}>
                {task.text}
              </span>
              {task.category && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `${catColor}20`, color: catColor }}
                >
                  {task.category}
                </span>
              )}
              <button
                onClick={() => remove(task.id)}
                className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-rd-border pt-3 mt-auto">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          className="rd-input text-sm"
        />
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="flex-1 text-xs border border-rd-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rd-accent text-rd-text bg-white"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={addTask}
            className="rd-btn text-xs px-3 py-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
