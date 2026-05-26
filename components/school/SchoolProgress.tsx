'use client';

import { useState } from 'react';
import { SchoolData } from '@/lib/types';
import { GraduationCap } from 'lucide-react';
import SemesterView from './SemesterView';
import RemainingCourses from './RemainingCourses';
import CollegeComparison from './CollegeComparison';
import CanvasSync from './CanvasSync';

interface Props {
  data: SchoolData;
  onChange: (data: SchoolData) => void;
}

const TABS = ['Semesters', 'Degree Plan', 'College Search'] as const;
type SchoolTab = typeof TABS[number];

export default function SchoolProgress({ data, onChange }: Props) {
  const [tab, setTab] = useState<SchoolTab>('Semesters');

  const allCourses = data.semesters.flatMap(s => s.courses);
  const gradedCourses = allCourses.filter(c => c.gradePoints !== undefined && c.credits);
  const totalCredits = gradedCourses.reduce((s, c) => s + c.credits, 0);
  const totalPoints = gradedCourses.reduce((s, c) => s + (c.gradePoints ?? 0) * c.credits, 0);
  const overallGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

  const completedPlanCredits = data.remainingCourses.filter(c => c.completed).reduce((s, c) => s + c.credits, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">School Progress</h2>
          <p className="text-slate-500 text-sm">{data.targetDegree}</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{overallGPA.toFixed(2)}</div>
            <div className="text-xs text-slate-500">Overall GPA</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{data.completedCredits + completedPlanCredits}</div>
            <div className="text-xs text-slate-500">Credits Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{data.totalCreditsRequired}</div>
            <div className="text-xs text-slate-500">Credits Required</div>
          </div>
        </div>
      </div>

      {/* Degree progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Degree Completion</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-indigo-600">
              {Math.min(100, Math.round(((data.completedCredits + completedPlanCredits) / data.totalCreditsRequired) * 100))}%
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Completed Credits:</label>
              <input
                type="number"
                value={data.completedCredits}
                onChange={e => onChange({ ...data, completedCredits: parseInt(e.target.value) || 0 })}
                className="w-16 text-sm text-center border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, ((data.completedCredits + completedPlanCredits) / data.totalCreditsRequired) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{data.completedCredits + completedPlanCredits} / {data.totalCreditsRequired} credits</span>
          <span>{Math.max(0, data.totalCreditsRequired - data.completedCredits - completedPlanCredits)} remaining</span>
        </div>
      </div>

      {/* Canvas sync bar */}
      <CanvasSync
        semesters={data.semesters}
        onChange={semesters => onChange({ ...data, semesters })}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Semesters' && (
        <SemesterView
          semesters={data.semesters}
          onChange={semesters => onChange({ ...data, semesters })}
        />
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
        <CollegeComparison
          colleges={data.colleges}
          onChange={colleges => onChange({ ...data, colleges })}
        />
      )}
    </div>
  );
}
