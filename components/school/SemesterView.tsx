'use client';

import { useState } from 'react';
import { Semester, Course, Assignment } from '@/lib/types';
import { Plus, Trash2, ChevronDown, ChevronUp, CalendarDays, BookOpen } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { parseISO, isPast } from 'date-fns';

interface Props {
  semesters: Semester[];
  onChange: (semesters: Semester[]) => void;
}

const GRADES: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0, 'IP': -1, 'W': -1,
};

function calcGPA(courses: Course[]): number {
  const graded = courses.filter(c => c.gradePoints !== undefined && c.gradePoints >= 0);
  if (!graded.length) return 0;
  const pts = graded.reduce((s, c) => s + (c.gradePoints ?? 0) * c.credits, 0);
  const creds = graded.reduce((s, c) => s + c.credits, 0);
  return creds > 0 ? pts / creds : 0;
}

function AssignmentRow({ assignment, onUpdate, onRemove }: {
  assignment: Assignment;
  onUpdate: (a: Assignment) => void;
  onRemove: () => void;
}) {
  const overdue = !assignment.submitted && isPast(parseISO(assignment.due));
  return (
    <div className={`group flex items-center gap-2 text-xs py-1 px-2 rounded ${overdue ? 'bg-red-50' : ''}`}>
      <input
        type="checkbox"
        checked={assignment.submitted}
        onChange={e => onUpdate({ ...assignment, submitted: e.target.checked })}
        className="w-3.5 h-3.5 rounded"
      />
      <span className={`flex-1 ${assignment.submitted ? 'line-through text-slate-400' : overdue ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
        {assignment.name}
      </span>
      <span className={`${overdue && !assignment.submitted ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
        Due {assignment.due}
      </span>
      {assignment.grade !== undefined && (
        <input
          type="number"
          value={assignment.grade}
          onChange={e => onUpdate({ ...assignment, grade: parseFloat(e.target.value) || 0 })}
          className="w-12 text-right border-b border-slate-200 bg-transparent focus:outline-none text-slate-600"
          placeholder="Grade"
        />
      )}
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function CourseCard({ course, onUpdate, onRemove }: {
  course: Course;
  onUpdate: (c: Course) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ name: '', due: '' });

  function addAssignment() {
    if (!newAssignment.name || !newAssignment.due) return;
    onUpdate({
      ...course,
      assignments: [...course.assignments, {
        id: nanoid(),
        name: newAssignment.name,
        due: newAssignment.due,
        submitted: false,
      }],
    });
    setNewAssignment({ name: '', due: '' });
  }

  const pending = course.assignments.filter(a => !a.submitted).length;
  const overdue = course.assignments.filter(a => !a.submitted && isPast(parseISO(a.due))).length;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-slate-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">{course.code}</span>
            <h5 className="font-semibold text-slate-800 text-sm truncate">{course.name}</h5>
            {overdue > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{overdue} overdue</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400">{course.credits} cr</span>
            {pending > 0 && <span className="text-xs text-amber-600">{pending} pending</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={course.grade ?? ''}
            onChange={e => {
              const g = e.target.value;
              onUpdate({ ...course, grade: g, gradePoints: GRADES[g] ?? undefined });
            }}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700"
          >
            <option value="">Grade</option>
            {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          <div className="space-y-0.5">
            {course.assignments.map(a => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onUpdate={updated => onUpdate({ ...course, assignments: course.assignments.map(x => x.id === a.id ? updated : x) })}
                onRemove={() => onUpdate({ ...course, assignments: course.assignments.filter(x => x.id !== a.id) })}
              />
            ))}
            {course.assignments.length === 0 && (
              <p className="text-xs text-slate-400 py-1">No assignments added.</p>
            )}
          </div>
          <div className="flex gap-2 border-t border-slate-100 pt-2">
            <input
              type="text"
              value={newAssignment.name}
              onChange={e => setNewAssignment(p => ({ ...p, name: e.target.value }))}
              placeholder="Assignment name"
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            <input
              type="date"
              value={newAssignment.due}
              onChange={e => setNewAssignment(p => ({ ...p, due: e.target.value }))}
              className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-600"
            />
            <button onClick={addAssignment} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={course.notes ?? ''}
            onChange={e => onUpdate({ ...course, notes: e.target.value })}
            placeholder="Course notes…"
            rows={2}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none text-slate-600"
          />
        </div>
      )}
    </div>
  );
}

export default function SemesterView({ semesters, onChange }: Props) {
  const [activeSemester, setActiveSemester] = useState<string | null>(semesters[0]?.id ?? null);
  const [newSemName, setNewSemName] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', credits: '3' });

  function addSemester() {
    if (!newSemName.trim()) return;
    const sem: Semester = { id: nanoid(), name: newSemName.trim(), courses: [] };
    onChange([...semesters, sem]);
    setActiveSemester(sem.id);
    setNewSemName('');
  }

  function removeSemester(id: string) {
    const next = semesters.filter(s => s.id !== id);
    onChange(next);
    if (activeSemester === id) setActiveSemester(next[0]?.id ?? null);
  }

  function updateSemester(updated: Semester) {
    onChange(semesters.map(s => s.id === updated.id ? { ...updated, gpa: calcGPA(updated.courses) } : s));
  }

  function addCourse() {
    if (!newCourse.name || !activeSemester) return;
    const course: Course = {
      id: nanoid(),
      name: newCourse.name,
      code: newCourse.code,
      credits: parseInt(newCourse.credits) || 3,
      assignments: [],
    };
    const sem = semesters.find(s => s.id === activeSemester);
    if (!sem) return;
    updateSemester({ ...sem, courses: [...sem.courses, course] });
    setNewCourse({ name: '', code: '', credits: '3' });
    setAddingCourse(false);
  }

  const active = semesters.find(s => s.id === activeSemester);

  // Upcoming assignments across all semesters
  const upcoming = semesters
    .flatMap(s => s.courses.flatMap(c => c.assignments.map(a => ({ ...a, course: c.name, sem: s.name }))))
    .filter(a => !a.submitted && !isPast(parseISO(a.due)))
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Upcoming assignments banner */}
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-amber-600" />
            <h4 className="font-semibold text-amber-800 text-sm">Upcoming Assignments</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcoming.map(a => (
              <div key={a.id} className="bg-white rounded-lg px-3 py-2 border border-amber-100">
                <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-slate-500 truncate">{a.course}</span>
                  <span className="text-xs font-medium text-amber-700 flex-shrink-0 ml-2">Due {a.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Semester list */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Semesters</h3>
          {semesters.map(sem => (
            <div key={sem.id} className="flex items-center gap-1 group">
              <button
                onClick={() => setActiveSemester(sem.id)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSemester === sem.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div>{sem.name}</div>
                {sem.gpa !== undefined && sem.gpa > 0 && (
                  <div className={`text-xs ${activeSemester === sem.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                    GPA: {sem.gpa.toFixed(2)}
                  </div>
                )}
              </button>
              <button
                onClick={() => removeSemester(sem.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex gap-1 mt-2">
            <input
              type="text"
              value={newSemName}
              onChange={e => setNewSemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSemester()}
              placeholder="e.g. Fall 2026"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder:text-slate-400 min-w-0"
            />
            <button onClick={addSemester} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Course list */}
        <div className="lg:col-span-3">
          {active ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">{active.name}</h3>
                  {active.gpa !== undefined && active.gpa > 0 && (
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      GPA: {active.gpa.toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setAddingCourse(!addingCourse)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Course
                </button>
              </div>

              {addingCourse && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="Course name" value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))}
                      className="col-span-2 text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input placeholder="Code (e.g. CS101)" value={newCourse.code} onChange={e => setNewCourse(p => ({ ...p, code: e.target.value }))}
                      className="text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input placeholder="Credits" type="number" value={newCourse.credits} onChange={e => setNewCourse(p => ({ ...p, credits: e.target.value }))}
                      className="text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCourse} className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Add Course</button>
                    <button onClick={() => setAddingCourse(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {active.courses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onUpdate={updated => updateSemester({ ...active, courses: active.courses.map(c => c.id === updated.id ? updated : c) })}
                    onRemove={() => updateSemester({ ...active, courses: active.courses.filter(c => c.id !== course.id) })}
                  />
                ))}
                {active.courses.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No courses yet. Add your first course!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p>Create a semester to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
