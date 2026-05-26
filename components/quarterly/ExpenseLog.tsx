'use client';

import { format, parseISO } from 'date-fns';
import { DollarSign, TrendingDown } from 'lucide-react';
import type { Expense } from '@/lib/types';

interface Props {
  expenses: Expense[];
}

function fmtAmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CAT_COLORS: Record<string, string> = {
  Groceries: 'bg-emerald-100 text-emerald-700',
  'Eating Out': 'bg-amber-100 text-amber-700',
  Transportation: 'bg-blue-100 text-blue-700',
  Entertainment: 'bg-purple-100 text-purple-700',
  Shopping: 'bg-pink-100 text-pink-700',
  Health: 'bg-red-100 text-red-700',
  Utilities: 'bg-slate-100 text-slate-700',
};

function catColor(cat: string) {
  return CAT_COLORS[cat] ?? 'bg-indigo-100 text-indigo-700';
}

export default function ExpenseLog({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-slate-800">Expense Log</h3>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">
          Log expenses via Eva: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">spent $45 groceries</code>
        </p>
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Totals by category
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const topCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-slate-800">Expense Log</h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold text-rose-600">
          <DollarSign className="w-3.5 h-3.5" />
          {fmtAmt(total)}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {topCats.map(([cat, amt]) => (
          <span key={cat} className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor(cat)}`}>
            {cat}: {fmtAmt(amt)}
          </span>
        ))}
      </div>

      {/* Entry list */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
        {sorted.map(e => (
          <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${catColor(e.category)}`}>
                {e.category}
              </span>
              {e.description && <span className="text-slate-500 truncate">{e.description}</span>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="font-semibold text-slate-700">{fmtAmt(e.amount)}</span>
              <span className="text-xs text-slate-400">{format(parseISO(e.date), 'MMM d')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
