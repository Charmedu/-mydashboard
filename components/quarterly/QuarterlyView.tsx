'use client';

import { useState } from 'react';
import { QuarterlyData, Expense } from '@/lib/types';
import QuarterlyGoals from './QuarterlyGoals';
import Finances from './Finances';
import Achievements from './Achievements';
import ParkingLot from './ParkingLot';
import ExpenseLog from './ExpenseLog';
import { ChevronLeft, ChevronRight, Target, CreditCard, PiggyBank, Trophy } from 'lucide-react';

interface Props {
  data: Record<string, QuarterlyData>;
  expenses: Expense[];
  onChange: (data: Record<string, QuarterlyData>) => void;
}

function thisQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
}

function shiftQuarter(key: string, n: number): string {
  const [y, qStr] = key.split('-Q');
  const total = parseInt(y) * 4 + (parseInt(qStr) - 1) + n;
  return `${Math.floor(total / 4)}-Q${(total % 4) + 1}`;
}

function emptyQuarter(quarter: string): QuarterlyData {
  return {
    quarter,
    goals: { finance: [], health: [], school: [], personal: [] },
    finances: { creditCards: [], savings: [] },
    achievements: [],
    parkingLot: [],
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function QuarterlyView({ data, expenses, onChange }: Props) {
  const current = thisQuarter();
  const [activeQ, setActiveQ] = useState(current);

  const qData = data[activeQ] ?? emptyQuarter(activeQ);
  const isCurrentQ = activeQ === current;
  const knownQuarters = Object.keys(data).sort();

  function update(updated: QuarterlyData) {
    onChange({ ...data, [activeQ]: updated });
  }

  const allGoals = Object.values(qData.goals).flat();
  const doneGoals = allGoals.filter(g => g.done).length;
  const goalPct = allGoals.length > 0 ? Math.round((doneGoals / allGoals.length) * 100) : null;

  const totalDebt = qData.finances.creditCards.reduce((s, c) => s + c.balance, 0);
  const totalSaved = qData.finances.savings.reduce((s, g) => s + g.current, 0);
  const savingsTarget = qData.finances.savings.reduce((s, g) => s + g.target, 0);
  const savingsPct = savingsTarget > 0 ? Math.min(100, Math.round((totalSaved / savingsTarget) * 100)) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-rd-text tracking-tight">Quarter View</h2>
          <p className="text-rd-muted text-sm mt-0.5">{activeQ}{isCurrentQ ? ' · Current' : ''}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Summary chips */}
          <div className="flex flex-wrap items-center gap-2">
            {goalPct !== null && (
              <div className="flex items-center gap-1.5 rd-card px-3 py-2">
                <Target className="w-3.5 h-3.5 text-rd-accent" />
                <span className="text-xs font-semibold text-rd-text">{doneGoals}/{allGoals.length} goals</span>
                <span className={`text-xs font-bold ml-1 ${goalPct >= 80 ? 'text-emerald-500' : goalPct >= 50 ? 'text-rd-accent' : 'text-rd-muted'}`}>
                  {goalPct}%
                </span>
              </div>
            )}
            {totalDebt > 0 && (
              <div className="flex items-center gap-1.5 rd-card px-3 py-2">
                <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-semibold text-rose-600">{fmt(totalDebt)} debt</span>
              </div>
            )}
            {totalSaved > 0 && (
              <div className="flex items-center gap-1.5 rd-card px-3 py-2">
                <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600">{fmt(totalSaved)} saved</span>
                {savingsPct !== null && (
                  <span className="text-xs text-rd-muted ml-0.5">({savingsPct}%)</span>
                )}
              </div>
            )}
            {qData.achievements.length > 0 && (
              <div className="flex items-center gap-1.5 rd-card px-3 py-2">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">{qData.achievements.length} wins</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveQ(q => shiftQuarter(q, -1))}
              className="p-2 rounded-lg hover:bg-rd-surface transition-colors duration-200"
              aria-label="Previous quarter"
            >
              <ChevronLeft className="w-5 h-5 text-rd-text" />
            </button>
            <button
              onClick={() => setActiveQ(current)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                isCurrentQ ? 'bg-rd-text text-rd-bg' : 'rd-btn-ghost'
              }`}
            >
              {current}
            </button>
            <button
              onClick={() => setActiveQ(q => shiftQuarter(q, 1))}
              className="p-2 rounded-lg hover:bg-rd-surface transition-colors duration-200"
              aria-label="Next quarter"
            >
              <ChevronRight className="w-5 h-5 text-rd-text" />
            </button>
          </div>
        </div>
      </div>

      {/* Quarter history pills */}
      {knownQuarters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {knownQuarters.map(q => (
            <button
              key={q}
              onClick={() => setActiveQ(q)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors duration-200 ${
                q === activeQ
                  ? 'bg-rd-text text-rd-bg border-rd-text'
                  : q === current
                  ? 'border-rd-accent text-rd-text hover:bg-rd-bg'
                  : 'border-rd-border text-rd-muted hover:border-rd-accent hover:text-rd-text'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {!data[activeQ] && (
        <div className="bg-rd-bg border border-dashed border-rd-border rounded-[10px] p-4 text-center text-sm text-rd-muted">
          No data for <span className="font-semibold text-rd-text">{activeQ}</span> yet — start adding goals to build history here.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <QuarterlyGoals goals={qData.goals} onChange={goals => update({ ...qData, goals })} />
        <Finances finances={qData.finances} onChange={finances => update({ ...qData, finances })} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Achievements achievements={qData.achievements} onChange={achievements => update({ ...qData, achievements })} />
        <ParkingLot items={qData.parkingLot} onChange={parkingLot => update({ ...qData, parkingLot })} />
      </div>

      <ExpenseLog expenses={expenses} />
    </div>
  );
}
