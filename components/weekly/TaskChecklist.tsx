'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { Plus, Trash2, Check } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface Props {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

const CATEGORIES = ['Work', 'Personal', 'Health', 'School', 'Finance', 'Other'];

export default function TaskChecklist({ tasks, onChange }: Props) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');

  function addTask() {
    if (!newText.trim()) return;
    onChange([...tasks, { id: nanoid(), text: newText.trim(), done: false, category: newCategory }]);
    setNewText('');
  }

  function toggle(id: string) {
    onChange(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id: string) {
    onChange(tasks.filter(t => t.id !== id));
  }

  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Tasks</h3>
        <span className="text-xs text-slate-500">{done}/{tasks.length} done</span>
      </div>

      {tasks.length > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto scrollbar-thin">
        {tasks.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">No tasks yet. Add one below.</p>
        )}
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-2 group py-1"
          >
            <button
              onClick={() => toggle(task.id)}
              className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                task.done
                  ? 'bg-indigo-500 border-indigo-500'
                  : 'border-slate-300 hover:border-indigo-400'
              }`}
            >
              {task.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`flex-1 text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {task.text}
            </span>
            {task.category && (
              <span className="text-xs text-slate-400 hidden group-hover:inline">{task.category}</span>
            )}
            <button
              onClick={() => remove(task.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <input
          type="text"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400"
        />
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-600 bg-white"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={addTask}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
