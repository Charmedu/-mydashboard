'use client';

import { useState } from 'react';
import { CreditCard as CreditCardType, SavingsGoal } from '@/lib/types';
import { Trash2, CreditCard, PiggyBank, DollarSign } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface Finances {
  creditCards: CreditCardType[];
  savings: SavingsGoal[];
  monthlyIncome?: number;
  monthlyExpenses?: number;
}

interface Props {
  finances: Finances;
  onChange: (f: Finances) => void;
}

const SAVING_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function Finances({ finances, onChange }: Props) {
  const [addingCard, setAddingCard] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', balance: '', limit: '', apr: '' });
  const [newSaving, setNewSaving] = useState({ name: '', current: '', target: '', color: SAVING_COLORS[0] });

  const totalDebt = finances.creditCards.reduce((s, c) => s + c.balance, 0);
  const totalSaved = finances.savings.reduce((s, g) => s + g.current, 0);

  function addCard() {
    if (!newCard.name || !newCard.balance) return;
    onChange({
      ...finances,
      creditCards: [...finances.creditCards, {
        id: nanoid(),
        name: newCard.name,
        balance: parseFloat(newCard.balance) || 0,
        limit: parseFloat(newCard.limit) || 0,
        apr: parseFloat(newCard.apr) || 0,
      }],
    });
    setNewCard({ name: '', balance: '', limit: '', apr: '' });
    setAddingCard(false);
  }

  function updateCardBalance(id: string, balance: number) {
    onChange({ ...finances, creditCards: finances.creditCards.map(c => c.id === id ? { ...c, balance } : c) });
  }

  function removeCard(id: string) {
    onChange({ ...finances, creditCards: finances.creditCards.filter(c => c.id !== id) });
  }

  function addSaving() {
    if (!newSaving.name || !newSaving.target) return;
    onChange({
      ...finances,
      savings: [...finances.savings, {
        id: nanoid(),
        name: newSaving.name,
        current: parseFloat(newSaving.current) || 0,
        target: parseFloat(newSaving.target) || 0,
        color: newSaving.color,
      }],
    });
    setNewSaving({ name: '', current: '', target: '', color: SAVING_COLORS[0] });
    setAddingSaving(false);
  }

  function updateSavingAmount(id: string, current: number) {
    onChange({ ...finances, savings: finances.savings.map(s => s.id === id ? { ...s, current } : s) });
  }

  function removeSaving(id: string) {
    onChange({ ...finances, savings: finances.savings.filter(s => s.id !== id) });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6">
      <h3 className="font-semibold text-slate-800">Finances</h3>

      {/* Monthly overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <input
            type="number"
            value={finances.monthlyIncome ?? ''}
            onChange={e => onChange({ ...finances, monthlyIncome: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="w-full text-center font-bold text-emerald-700 text-sm bg-transparent border-none outline-none"
          />
          <p className="text-xs text-slate-400 mt-0.5">Income/mo</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <DollarSign className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <input
            type="number"
            value={finances.monthlyExpenses ?? ''}
            onChange={e => onChange({ ...finances, monthlyExpenses: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="w-full text-center font-bold text-red-700 text-sm bg-transparent border-none outline-none"
          />
          <p className="text-xs text-slate-400 mt-0.5">Expenses/mo</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <DollarSign className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <p className="font-bold text-blue-700 text-sm">
            {fmt(Math.max(0, (finances.monthlyIncome ?? 0) - (finances.monthlyExpenses ?? 0)))}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Savings/mo</p>
        </div>
      </div>

      {/* Credit Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-500" />
            <h4 className="font-medium text-slate-700 text-sm">Credit Cards</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-rose-600">{fmt(totalDebt)} total</span>
            <button onClick={() => setAddingCard(!addingCard)} className="text-xs text-indigo-600 hover:underline">
              + Add
            </button>
          </div>
        </div>

        {addingCard && (
          <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Card name" value={newCard.name} onChange={e => setNewCard(p => ({ ...p, name: e.target.value }))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input placeholder="Balance ($)" type="number" value={newCard.balance} onChange={e => setNewCard(p => ({ ...p, balance: e.target.value }))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input placeholder="Limit ($)" type="number" value={newCard.limit} onChange={e => setNewCard(p => ({ ...p, limit: e.target.value }))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input placeholder="APR (%)" type="number" value={newCard.apr} onChange={e => setNewCard(p => ({ ...p, apr: e.target.value }))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2">
              <button onClick={addCard} className="flex-1 py-1.5 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 transition-colors">Save Card</button>
              <button onClick={() => setAddingCard(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {finances.creditCards.map(card => {
            const util = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
            const utilColor = util > 70 ? 'bg-red-500' : util > 30 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={card.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{card.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={card.balance}
                      onChange={e => updateCardBalance(card.id, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right text-sm font-semibold text-rose-700 border-b border-slate-200 focus:outline-none focus:border-indigo-400 bg-transparent"
                    />
                    <span className="text-xs text-slate-400">/ {fmt(card.limit)}</span>
                    <button onClick={() => removeCard(card.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${utilColor} rounded-full transition-all`} style={{ width: `${Math.min(util, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-slate-400">{card.apr}% APR</span>
                  <span className="text-xs text-slate-400">{util.toFixed(0)}% utilization</span>
                </div>
              </div>
            );
          })}
          {finances.creditCards.length === 0 && <p className="text-xs text-slate-400">No cards added.</p>}
        </div>
      </div>

      {/* Savings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-500" />
            <h4 className="font-medium text-slate-700 text-sm">Savings Goals</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-600">{fmt(totalSaved)} saved</span>
            <button onClick={() => setAddingSaving(!addingSaving)} className="text-xs text-indigo-600 hover:underline">
              + Add
            </button>
          </div>
        </div>

        {addingSaving && (
          <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
            <input placeholder="Goal name (e.g. Emergency Fund)" value={newSaving.name} onChange={e => setNewSaving(p => ({ ...p, name: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Current ($)" type="number" value={newSaving.current} onChange={e => setNewSaving(p => ({ ...p, current: e.target.value }))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input placeholder="Target ($)" type="number" value={newSaving.target} onChange={e => setNewSaving(p => ({ ...p, target: e.target.value }))}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2">
              {SAVING_COLORS.map(c => (
                <button key={c} onClick={() => setNewSaving(p => ({ ...p, color: c }))}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: newSaving.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addSaving} className="flex-1 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors">Save Goal</button>
              <button onClick={() => setAddingSaving(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {finances.savings.map(goal => {
            const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
            return (
              <div key={goal.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={goal.current}
                      onChange={e => updateSavingAmount(goal.id, parseFloat(e.target.value) || 0)}
                      className="w-20 text-right text-sm font-semibold border-b border-slate-200 focus:outline-none focus:border-indigo-400 bg-transparent"
                      style={{ color: goal.color }}
                    />
                    <span className="text-xs text-slate-400">/ {fmt(goal.target)}</span>
                    <button onClick={() => removeSaving(goal.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: goal.color }} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5 text-right">{pct.toFixed(0)}% of goal</p>
              </div>
            );
          })}
          {finances.savings.length === 0 && <p className="text-xs text-slate-400">No savings goals added.</p>}
        </div>
      </div>
    </div>
  );
}
