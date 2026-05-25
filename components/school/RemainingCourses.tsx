'use client';

import { useState } from 'react';
import { RemainingCourse } from '@/lib/types';
import { Plus, Trash2, Check, BookOpen } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface Props {
  courses: RemainingCourse[];
  totalRequired: number;
  completedBefore: number;
  onChange: (courses: RemainingCourse[]) => void;
}

const CATEGORIES = ['Core', 'Major Elective', 'General Education', 'Math/Science', 'Lab', 'Capstone', 'Other'];

const CAT_COLORS: Record<string, string> = {
  'Core': 'bg-indigo-100 text-indigo-700',
  'Major Elective': 'bg-violet-100 text-violet-700',
  'General Education': 'bg-slate-100 text-slate-600',
  'Math/Science': 'bg-blue-100 text-blue-700',
  'Lab': 'bg-emerald-100 text-emerald-700',
  'Capstone': 'bg-amber-100 text-amber-700',
  'Other': 'bg-pink-100 text-pink-700',
};

export default function RemainingCourses({ courses, totalRequired, completedBefore, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [newCourse, setNewCourse] = useState({
    name: '', code: '', credits: '3', category: 'Core', plannedSemester: '', notes: ''
  });

  function addCourse() {
    if (!newCourse.name.trim()) return;
    onChange([...courses, {
      id: nanoid(),
      name: newCourse.name.trim(),
      code: newCourse.code.trim(),
      credits: parseInt(newCourse.credits) || 3,
      category: newCourse.category,
      completed: false,
      plannedSemester: newCourse.plannedSemester || undefined,
      notes: newCourse.notes || undefined,
    }]);
    setNewCourse({ name: '', code: '', credits: '3', category: 'Core', plannedSemester: '', notes: '' });
    setShowForm(false);
  }

  function toggleComplete(id: string) {
    onChange(courses.map(c => c.id === id ? { ...c, completed: !c.completed } : c));
  }

  function removeCourse(id: string) {
    onChange(courses.filter(c => c.id !== id));
  }

  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const completedCredits = courses.filter(c => c.completed).reduce((s, c) => s + c.credits, 0);
  const remaining = Math.max(0, totalRequired - completedBefore - completedCredits);

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category)))];
  const filtered = filterCat === 'All' ? courses : courses.filter(c => c.category === filterCat);

  const groupedByCat = CATEGORIES.reduce<Record<string, RemainingCourse[]>>((acc, cat) => {
    const catCourses = filtered.filter(c => c.category === cat);
    if (catCourses.length > 0) acc[cat] = catCourses;
    return acc;
  }, {});
  const otherCats = filtered.filter(c => !CATEGORIES.includes(c.category));
  if (otherCats.length > 0) groupedByCat['Other'] = [...(groupedByCat['Other'] ?? []), ...otherCats];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{courses.length}</div>
          <div className="text-xs text-slate-500 mt-1">Planned Courses</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{courses.filter(c => c.completed).length}</div>
          <div className="text-xs text-slate-500 mt-1">Completed</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{totalCredits}</div>
          <div className="text-xs text-slate-500 mt-1">Plan Credits</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">{remaining}</div>
          <div className="text-xs text-slate-500 mt-1">Still Needed</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterCat === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Add Course to Degree Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Course name *" value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))}
              className="sm:col-span-2 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Code (e.g. CYSE 101)" value={newCourse.code} onChange={e => setNewCourse(p => ({ ...p, code: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Category</label>
              <select value={newCourse.category} onChange={e => setNewCourse(p => ({ ...p, category: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-slate-700">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Credits</label>
              <input type="number" value={newCourse.credits} onChange={e => setNewCourse(p => ({ ...p, credits: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Planned Semester</label>
              <input placeholder="e.g. Fall 2026" value={newCourse.plannedSemester} onChange={e => setNewCourse(p => ({ ...p, plannedSemester: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <input placeholder="Notes (optional)" value={newCourse.notes} onChange={e => setNewCourse(p => ({ ...p, notes: e.target.value }))}
              className="sm:col-span-3 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex gap-2">
            <button onClick={addCourse} className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Add to Plan</button>
            <button onClick={() => setShowForm(false)} className="px-4 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Course table by category */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No courses in your degree plan yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByCat).map(([cat, catCourses]) => (
            <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`}>{cat}</span>
                  <span className="text-xs text-slate-400">
                    {catCourses.filter(c => c.completed).length}/{catCourses.length} · {catCourses.reduce((s, c) => s + c.credits, 0)} credits
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {catCourses.map(course => (
                  <div key={course.id} className={`flex items-center gap-3 px-4 py-3 group transition-colors ${course.completed ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                    <button
                      onClick={() => toggleComplete(course.id)}
                      className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        course.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {course.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {course.code && <span className="text-xs font-mono text-slate-400">{course.code}</span>}
                        <span className={`text-sm font-medium ${course.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {course.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">{course.credits} credits</span>
                        {course.plannedSemester && (
                          <span className="text-xs text-indigo-500">{course.plannedSemester}</span>
                        )}
                        {course.notes && (
                          <span className="text-xs text-slate-400 truncate">{course.notes}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCourse(course.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
