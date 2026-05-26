'use client';

import { useState } from 'react';
import { Semester, Course, Assignment } from '@/lib/types';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import { format, parseISO } from 'date-fns';

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

type Status = 'idle' | 'syncing' | 'done' | 'error';

export default function CanvasSync({ semesters, onChange }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ courses: number; assignments: number } | null>(null);

  async function sync() {
    setStatus('syncing');
    setError('');
    try {
      const res = await fetch('/api/canvas');
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Determine semester name — prefer Canvas term name, fall back to date-based
      const firstTerm = json.courses[0]?.course?.term?.name as string | undefined;
      const termLabel = firstTerm ?? termFromDate();
      const semesterName = `Canvas · ${termLabel}`;

      // Map Canvas payload → Course[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedCourses: Course[] = json.courses.map(({ course, assignments }: any) =>
        mapCourse(course, assignments)
      );

      const totalAssignments = mappedCourses.reduce((s, c) => s + c.assignments.length, 0);
      setCounts({ courses: mappedCourses.length, assignments: totalAssignments });

      // Upsert the Canvas semester: replace if it already exists, otherwise prepend
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

  const statusText = () => {
    if (status === 'syncing') return 'Fetching courses and assignments…';
    if (status === 'done' && counts)
      return `${counts.courses} courses · ${counts.assignments} upcoming assignments · synced ${syncedAt}`;
    if (status === 'error') return error;
    if (syncedAt) return `Last synced at ${syncedAt} · canvas.tccd.edu`;
    return 'canvas.tccd.edu · Not synced yet';
  };

  return (
    <div className="bg-slate-900 rounded-xl px-5 py-4 flex flex-wrap items-center gap-4">
      {/* Icon + label */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white leading-tight">Canvas LMS</div>
          <div className={`text-xs mt-0.5 truncate ${status === 'error' ? 'text-red-400' : status === 'done' ? 'text-emerald-400' : 'text-slate-400'}`}>
            {statusText()}
          </div>
        </div>
      </div>

      {/* Status icon on the right of text */}
      {status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
      {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}

      {/* Sync button */}
      <button
        onClick={sync}
        disabled={status === 'syncing'}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors flex-shrink-0"
      >
        {status === 'syncing'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <RefreshCw className="w-4 h-4" />}
        {status === 'syncing' ? 'Syncing…' : 'Sync Now'}
      </button>
    </div>
  );
}
