'use client';

import { useState } from 'react';
import { Semester, Course, Assignment } from '@/lib/types';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, GraduationCap, BookOpen, Clock } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { format, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';

interface Props {
  semesters: Semester[];
  onChange: (semesters: Semester[]) => void;
}

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};

function scoreToLetter(score: number): string {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function termFromDate(): string {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m <= 5) return `Spring ${y}`;
  if (m <= 7) return `Summer ${y}`;
  return `Fall ${y}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCourse(c: any, rawAssignments: any[]): Course {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollment = c.enrollments?.find((e: any) => e.type === 'student');
  const score = enrollment?.computed_current_score as number | undefined;
  const rawGrade = enrollment?.computed_current_grade as string | undefined;
  const grade = rawGrade || (score != null ? scoreToLetter(score) : undefined);

  const assignments: Assignment[] = rawAssignments
    .filter((a) => !!a.due_at)
    .map((a) => ({
      id: `canvas-${a.id}`,
      name: a.name,
      due: format(parseISO(a.due_at), 'yyyy-MM-dd'),
      submitted: !!a.submission?.submitted_at,
      grade: a.submission?.score != null ? a.submission.score : undefined,
    }));

  return {
    id: `canvas-${c.id}`,
    name: c.name,
    code: c.course_code ?? '',
    credits: c.credit_hours ?? 3,
    grade,
    gradePoints: grade !== undefined ? (GRADE_POINTS[grade] ?? undefined) : undefined,
    assignments,
    notes: score != null ? `Current score: ${score.toFixed(1)}%` : undefined,
  };
}

function gradeColor(grade: string | undefined): string {
  if (!grade) return 'text-rd-muted';
  const gp = GRADE_POINTS[grade];
  if (gp === undefined) return 'text-rd-muted';
  if (gp >= 3.7) return 'text-emerald-600';
  if (gp >= 2.7) return 'text-rd-text';
  if (gp >= 1.7) return 'text-amber-600';
  return 'text-red-500';
}

type Status = 'idle' | 'syncing' | 'done' | 'error';

interface UpcomingAssignment {
  courseName: string;
  courseCode: string;
  name: string;
  due: string;
  submitted: boolean;
}

export default function CanvasSync({ semesters, onChange }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [syncedCourses, setSyncedCourses] = useState<Course[]>([]);

  async function sync() {
    setStatus('syncing');
    setError('');
    try {
      const res = await fetch('/api/canvas');
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const firstTerm = json.courses[0]?.course?.term?.name as string | undefined;
      const termLabel = firstTerm ?? termFromDate();
      const semesterName = `Canvas · ${termLabel}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedCourses: Course[] = json.courses.map(({ course, assignments }: any) =>
        mapCourse(course, assignments)
      );

      setSyncedCourses(mappedCourses);

      const existingIdx = semesters.findIndex((s) => s.name === semesterName);
      let updated: Semester[];
      if (existingIdx >= 0) {
        updated = semesters.map((s, i) =>
          i === existingIdx ? { ...s, courses: mappedCourses } : s
        );
      } else {
        updated = [{ id: nanoid(), name: semesterName, courses: mappedCourses }, ...semesters];
      }

      onChange(updated);
      setSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
      setStatus('error');
    }
  }

  // Collect upcoming assignments (next 14 days, not submitted) from synced courses
  const upcoming: UpcomingAssignment[] = syncedCourses
    .flatMap(c =>
      c.assignments
        .filter(a => {
          const due = new Date(a.due);
          const now = new Date();
          return !a.submitted && isWithinInterval(due, { start: now, end: addDays(now, 14) });
        })
        .map(a => ({ courseName: c.name, courseCode: c.code, name: a.name, due: a.due, submitted: a.submitted }))
    )
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8);

  const overdueCount = syncedCourses
    .flatMap(c => c.assignments)
    .filter(a => !a.submitted && isPast(new Date(a.due))).length;

  return (
    <div className="rd-card p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 bg-rd-accent rounded-full flex-shrink-0" />
          <GraduationCap className="w-4 h-4 text-rd-accent" />
          <h3 className="font-semibold text-rd-text text-sm">Canvas LMS</h3>
          <span className="text-xs text-rd-muted">canvas.tccd.edu</span>
        </div>
        <div className="flex items-center gap-3">
          {status === 'done' && syncedAt && (
            <span className="text-xs text-rd-muted">Synced {syncedAt}</span>
          )}
          {status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
          {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <button
            onClick={sync}
            disabled={status === 'syncing'}
            className="rd-btn flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'syncing'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {status === 'syncing' ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Idle / not synced yet */}
      {status === 'idle' && !syncedAt && (
        <p className="text-sm text-rd-muted text-center py-2">
          Click <span className="font-medium text-rd-text">Sync Now</span> to pull your courses, grades, and upcoming assignments from Canvas.
        </p>
      )}

      {/* Courses grid */}
      {syncedCourses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {syncedCourses.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-rd-bg border border-rd-border">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-rd-text truncate">{c.name}</p>
                <p className="text-[11px] text-rd-muted">{c.code}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${gradeColor(c.grade)}`}>{c.grade ?? '—'}</p>
                {c.notes && (
                  <p className="text-[10px] text-rd-muted">{c.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming assignments */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-rd-accent" />
            <span className="text-xs font-semibold text-rd-text">Due in the next 14 days</span>
            {overdueCount > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                {overdueCount} overdue
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {upcoming.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <BookOpen className="w-3 h-3 text-rd-muted flex-shrink-0" />
                <span className="text-rd-muted font-medium w-20 flex-shrink-0 truncate">{a.courseCode || a.courseName.split(' ')[0]}</span>
                <span className="text-rd-text flex-1 truncate">{a.name}</span>
                <span className="text-rd-muted flex-shrink-0 whitespace-nowrap">
                  {format(parseISO(a.due), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
