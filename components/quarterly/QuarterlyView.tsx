'use client';

import { QuarterlyData } from '@/lib/types';
import QuarterlyGoals from './QuarterlyGoals';
import Finances from './Finances';

interface Props {
  data: QuarterlyData;
  onChange: (data: QuarterlyData) => void;
}

export default function QuarterlyView({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Quarterly View</h2>
        <p className="text-slate-500 text-sm">{data.quarter}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <QuarterlyGoals
          goals={data.goals}
          onChange={goals => onChange({ ...data, goals })}
        />
        <Finances
          finances={data.finances}
          onChange={finances => onChange({ ...data, finances })}
        />
      </div>
    </div>
  );
}
