'use client';

import { useState } from 'react';
import { SchoolData, UniversityEmail } from '@/lib/types';
import { GraduationCap } from 'lucide-react';
import SemesterView from './SemesterView';
import RemainingCourses from './RemainingCourses';
import CollegeComparison from './CollegeComparison';
import CanvasSync from './CanvasSync';
import UniversityEmails from './UniversityEmails';

interface Props {
  data: SchoolData;
  universityEmails: UniversityEmail[];
  onChange: (data: SchoolData) => void;
}

const TABS = ['Semesters', 'Degree Plan', 'College Search'] as const;
type SchoolTab = typeof TABS[number];

export default function SchoolProgress({ data, universityEmails, onChange }: Props) {
  const [tab, setTab] = useState<SchoolTab>('Semesters');

  const allCourses = data.semesters.flatMap(s => s.courses);
  const gradedCourses = allCourses.filter(c => c.gradePoints !== undefined && c.credits);
  const totalCredits = gradedCourses.reduce((s, c) => s + c.credits, 0);
  const totalPoints = gradedCourses.reduce((s, c) => s + (c.gradePoints ?? 0) * c.credits, 0);
  const overallGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

  const completedPlanCredits = data.remainingCourses.filter(c => c.completed).reduce((s, c) => s + c.credits, 0);
  const totalEarned = data.completedCredits + completedPlanCredits;
  const progressPct = Math.min(100, Math.round((totalEarned / data.totalCreditsRequired) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-rd-text tracking-tight">School Progress</h2>
          <p className="text-rd-muted text-sm">{data.targetDegree}</p>
        </div>
        <div className="flex gap-5">
          {[
            { value: overallGPA.toFixed(2), label: 'Overall GPA', color: 'text-rd-text' },
            { value: String(totalEarned), label: 'Credits Earned', color: 'text-emerald-600' },
            { value: String(data.totalCreditsRequired), label: 'Credits Required', color: 'text-rd-muted' },
          ].map(({ value, label, color }) => (
            <div key={label} className="text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-rd-muted">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Degree progress */}
      <div className="rd-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-rd-accent" />
            <span className="text-sm font-medium text-rd-text">Degree Completion</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-rd-text">{progressPct}%</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-rd-muted">Completed Credits:</label>
              <input
                type="number"
                value={data.completedCredits}
                onChange={e => onChange({ ...data, completedCredits: parseInt(e.target.value) || 0 })}
                className="w-16 text-sm text-center border border-rd-border rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-rd-accent text-rd-text bg-white"
              />
            </div>
          </div>
        </div>
        <div className="h-3 bg-rd-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #5c3e38, #d4b0a8)' }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-rd-muted">
          <span>{totalEarned} / {data.totalCreditsRequired} credits</span>
          <span>{Math.max(0, data.totalCreditsRequired - totalEarned)} remaining</span>
        </div>
      </div>

      <CanvasSync semesters={data.semesters} onChange={semesters => onChange({ ...data, semesters })} />

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-rd-bg border border-rd-border rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              tab === t
                ? 'bg-rd-text text-rd-bg shadow-sm'
                : 'text-rd-muted hover:text-rd-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Semesters' && (
        <SemesterView semesters={data.semesters} onChange={semesters => onChange({ ...data, semesters })} />
      )}
      {tab === 'Degree Plan' && (
        <RemainingCourses
          courses={data.remainingCourses}
          totalRequired={data.totalCreditsRequired}
          completedBefore={data.completedCredits}
          onChange={courses => onChange({ ...data, remainingCourses: courses })}
        />
      )}
      {tab === 'College Search' && (
        <CollegeComparison colleges={data.colleges} onChange={colleges => onChange({ ...data, colleges })} />
      )}

      {universityEmails.length > 0 && <UniversityEmails emails={universityEmails} />}
    </div>
  );
}
