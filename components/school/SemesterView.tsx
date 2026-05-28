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
        style={{ accentColor: '#5c3e38' }}
      />
      <span className={`flex-1 ${assignment.submitted ? 'line-through text-rd-muted' : overdue ? 'text-red-600 font-medium' : 'text-rd-text'}`}>
        {assignment.name}
      </span>
      <span className={`${overdue && !assignment.submitted ? 'text-red-500 font-medium' : 'text-rd-muted'}`}>
        Due {assignment.due}
      </span>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all">
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
      assignments: [...course.assignments, { id: nanoid(), name: newAssignment.name, due: newAssignment.due, submitted: false }],
    });
    setNewAssignment({ name: '', due: '' });
  }

  const pending = course.assignments.filter(a => !a.submitted).length;
  const overdue = course.assignments.filter(a => !a.submitted && isPast(parseISO(a.due))).length;

  return (
    <div className="border border-rd-border rounded-[10px] overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-rd-bg">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-rd-muted">{course.code}</span>
            <h5 className="font-semibold text-rd-text text-sm truncate">{course.name}</h5>
            {overdue > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{overdue} overdue</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-rd-muted">{course.credits} cr</span>
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
            className="text-sm border border-rd-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-rd-accent text-rd-text"
          >
            <option value="">Grade</option>
            {Object.keys(GRADES).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={() => setExpanded(!expanded)} className="text-rd-muted hover:text-rd-text transition-colors duration-200">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="text-rd-muted hover:text-red-400 transition-colors duration-200">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2 bg-white">
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
              <p className="text-xs text-rd-muted py-1">No assignments added.</p>
            )}
          </div>
          <div className="flex gap-2 border-t border-rd-border pt-2">
            <input
              type="text"
              value={newAssignment.name}
              onChange={e => setNewAssignment(p => ({ ...p, name: e.target.value }))}
              placeholder="Assignment name"
              className="flex-1 text-xs border border-rd-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rd-accent text-rd-text"
            />
            <input
              type="date"
              value={newAssignment.due}
              onChange={e => setNewAssignment(p => ({ ...p, due: e.target.value }))}
              className="text-xs border border-rd-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rd-accent text-rd-text"
            />
            <button onClick={addAssignment} className="rd-btn px-2 py-1 text-xs">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={course.notes ?? ''}
            onChange={e => onUpdate({ ...course, notes: e.target.value })}
            placeholder="Course notes…"
            rows={2}
            className="rd-input text-xs resize-none"
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
      id: nanoid(), name: newCourse.name, code: newCourse.code,
      credits: parseInt(newCourse.credits) || 3, assignments: [],
    };
    const sem = semesters.find(s => s.id === activeSemester);
    if (!sem) return;
    updateSemester({ ...sem, courses: [...sem.courses, course] });
    setNewCourse({ name: '', code: '', credits: '3' });
    setAddingCourse(false);
  }

  const active = semesters.find(s => s.id === activeSemester);

  const upcoming = semesters
    .flatMap(s => s.courses.flatMap(c => c.assignments.map(a => ({ ...a, course: c.name, sem: s.name }))))
    .filter(a => !a.submitted && !isPast(parseISO(a.due)))
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-amber-600" />
            <h4 className="font-semibold text-amber-800 text-sm">Upcoming Assignments</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcoming.map(a => (
              <div key={a.id} className="bg-white rounded-lg px-3 py-2 border border-amber-100 shadow-sm">
                <p className="text-sm font-medium text-rd-text truncate">{a.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-rd-muted truncate">{a.course}</span>
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
          <h3 className="text-xs font-bold text-rd-muted uppercase tracking-widest mb-3">Semesters</h3>
          {semesters.map(sem => (
            <div key={sem.id} className="flex items-center gap-1 group">
              <button
                onClick={() => setActiveSemester(sem.id)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  activeSemester === sem.id
                    ? 'bg-rd-text text-rd-bg'
                    : 'text-rd-text hover:bg-rd-bg border border-transparent hover:border-rd-border'
                }`}
              >
                <div>{sem.name}</div>
                {sem.gpa !== undefined && sem.gpa > 0 && (
                  <div className={`text-xs ${activeSemester === sem.id ? 'text-rd-accent' : 'text-rd-muted'}`}>
                    GPA: {sem.gpa.toFixed(2)}
                  </div>
                )}
              </button>
              <button
                onClick={() => removeSemester(sem.id)}
                className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all p-1"
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
              className="rd-input flex-1 text-sm min-w-0"
            />
            <button onClick={addSemester} className="rd-btn p-1.5 flex-shrink-0">
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
                  <h3 className="font-semibold text-rd-text">{active.name}</h3>
                  {active.gpa !== undefined && active.gpa > 0 && (
                    <span className="text-sm font-bold text-rd-text bg-rd-bg border border-rd-border px-2 py-0.5 rounded-full">
                      GPA: {active.gpa.toFixed(2)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setAddingCourse(!addingCourse)}
                  className="rd-btn text-sm px-3 py-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Course
                </button>
              </div>

              {addingCourse && (
                <div className="rd-card p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="Course name" value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))}
                      className="rd-input col-span-2 text-sm" />
                    <input placeholder="Code (e.g. CS101)" value={newCourse.code} onChange={e => setNewCourse(p => ({ ...p, code: e.target.value }))}
                      className="rd-input text-sm" />
                    <input placeholder="Credits" type="number" value={newCourse.credits} onChange={e => setNewCourse(p => ({ ...p, credits: e.target.value }))}
                      className="rd-input text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCourse} className="rd-btn flex-1 py-2 text-sm justify-center">Add Course</button>
                    <button onClick={() => setAddingCourse(false)} className="rd-btn-ghost px-4 py-2 text-sm">Cancel</button>
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
                  <div className="text-center py-8 text-rd-muted">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No courses yet. Add your first course!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-rd-muted">
              <p>Create a semester to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
