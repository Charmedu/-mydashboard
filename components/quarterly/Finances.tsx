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

const SAVING_COLORS = ['#5c3e38', '#d4b0a8', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

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
    <div className="rd-card p-5 space-y-6">
      <h3 className="rd-section-title text-sm">Finances</h3>

      {/* Monthly overview */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: DollarSign, color: 'text-emerald-500', labelColor: 'text-emerald-600', label: 'Income/mo',
            value: finances.monthlyIncome ?? '',
            onChange: (v: string) => onChange({ ...finances, monthlyIncome: parseFloat(v) || 0 }) },
          { icon: DollarSign, color: 'text-rose-400', labelColor: 'text-rose-600', label: 'Expenses/mo',
            value: finances.monthlyExpenses ?? '',
            onChange: (v: string) => onChange({ ...finances, monthlyExpenses: parseFloat(v) || 0 }) },
        ].map(({ icon: Icon, color, labelColor, label, value, onChange: onCh }) => (
          <div key={label} className="bg-rd-bg rounded-lg p-3 text-center border border-rd-border">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <input
              type="number"
              value={value}
              onChange={e => onCh(e.target.value)}
              placeholder="0"
              className={`w-full text-center font-bold text-sm bg-transparent border-none outline-none ${labelColor}`}
            />
            <p className="text-xs text-rd-muted mt-0.5">{label}</p>
          </div>
        ))}
        <div className="bg-rd-bg rounded-lg p-3 text-center border border-rd-border">
          <DollarSign className="w-4 h-4 text-rd-accent mx-auto mb-1" />
          <p className="font-bold text-rd-text text-sm">
            {fmt(Math.max(0, (finances.monthlyIncome ?? 0) - (finances.monthlyExpenses ?? 0)))}
          </p>
          <p className="text-xs text-rd-muted mt-0.5">Savings/mo</p>
        </div>
      </div>

      {/* Credit Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <h4 className="font-medium text-rd-text text-sm">Credit Cards</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-rose-600">{fmt(totalDebt)} total</span>
            <button onClick={() => setAddingCard(!addingCard)} className="text-xs text-rd-text hover:underline font-medium">
              + Add
            </button>
          </div>
        </div>

        {addingCard && (
          <div className="bg-rd-bg rounded-lg p-3 mb-3 space-y-2 border border-rd-border">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Card name" value={newCard.name} onChange={e => setNewCard(p => ({ ...p, name: e.target.value }))}
                className="rd-input text-sm col-span-2" />
              <input placeholder="Balance ($)" type="number" value={newCard.balance} onChange={e => setNewCard(p => ({ ...p, balance: e.target.value }))}
                className="rd-input text-sm" />
              <input placeholder="Limit ($)" type="number" value={newCard.limit} onChange={e => setNewCard(p => ({ ...p, limit: e.target.value }))}
                className="rd-input text-sm" />
              <input placeholder="APR (%)" type="number" value={newCard.apr} onChange={e => setNewCard(p => ({ ...p, apr: e.target.value }))}
                className="rd-input text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={addCard} className="flex-1 py-1.5 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600 transition-colors duration-200">Save Card</button>
              <button onClick={() => setAddingCard(false)} className="rd-btn-ghost px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {finances.creditCards.map(card => {
            const util = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
            const utilColor = util > 70 ? 'bg-red-400' : util > 30 ? 'bg-amber-400' : 'bg-emerald-500';
            return (
              <div key={card.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-rd-text">{card.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={card.balance}
                      onChange={e => updateCardBalance(card.id, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right text-sm font-semibold text-rose-600 border-b border-rd-border focus:outline-none focus:border-rd-accent bg-transparent"
                    />
                    <span className="text-xs text-rd-muted">/ {fmt(card.limit)}</span>
                    <button onClick={() => removeCard(card.id)} className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 bg-rd-border rounded-full overflow-hidden">
                  <div className={`h-full ${utilColor} rounded-full transition-all`} style={{ width: `${Math.min(util, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-rd-muted">{card.apr}% APR</span>
                  <span className="text-xs text-rd-muted">{util.toFixed(0)}% utilization</span>
                </div>
              </div>
            );
          })}
          {finances.creditCards.length === 0 && <p className="text-xs text-rd-muted">No cards added.</p>}
        </div>
      </div>

      {/* Savings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-500" />
            <h4 className="font-medium text-rd-text text-sm">Savings Goals</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-600">{fmt(totalSaved)} saved</span>
            <button onClick={() => setAddingSaving(!addingSaving)} className="text-xs text-rd-text hover:underline font-medium">
              + Add
            </button>
          </div>
        </div>

        {addingSaving && (
          <div className="bg-rd-bg rounded-lg p-3 mb-3 space-y-2 border border-rd-border">
            <input placeholder="Goal name (e.g. Emergency Fund)" value={newSaving.name} onChange={e => setNewSaving(p => ({ ...p, name: e.target.value }))}
              className="rd-input text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Current ($)" type="number" value={newSaving.current} onChange={e => setNewSaving(p => ({ ...p, current: e.target.value }))}
                className="rd-input text-sm" />
              <input placeholder="Target ($)" type="number" value={newSaving.target} onChange={e => setNewSaving(p => ({ ...p, target: e.target.value }))}
                className="rd-input text-sm" />
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
              <button onClick={addSaving} className="flex-1 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors duration-200">Save Goal</button>
              <button onClick={() => setAddingSaving(false)} className="rd-btn-ghost px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {finances.savings.map(goal => {
            const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
            return (
              <div key={goal.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-rd-text">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={goal.current}
                      onChange={e => updateSavingAmount(goal.id, parseFloat(e.target.value) || 0)}
                      className="w-20 text-right text-sm font-semibold border-b border-rd-border focus:outline-none focus:border-rd-accent bg-transparent"
                      style={{ color: goal.color }}
                    />
                    <span className="text-xs text-rd-muted">/ {fmt(goal.target)}</span>
                    <button onClick={() => removeSaving(goal.id)} className="opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-rd-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: goal.color }} />
                </div>
                <p className="text-xs text-rd-muted mt-0.5 text-right">{pct.toFixed(0)}% of goal</p>
              </div>
            );
          })}
          {finances.savings.length === 0 && <p className="text-xs text-rd-muted">No savings goals added.</p>}
        </div>
      </div>
    </div>
  );
}
