'use client';

import { useState } from 'react';
import { College } from '@/lib/types';
import { Plus, Trash2, ExternalLink, Star, Check, X } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';

interface Props {
  colleges: College[];
  onChange: (colleges: College[]) => void;
}

const FORMATS = ['Online', 'Hybrid', 'In-person'];
const TYPES = ['public', 'private', 'nonprofit', 'for-profit'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function CollegeComparison({ colleges, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCollege, setNewCollege] = useState({
    name: '', location: '', type: 'public', programName: '',
    tuitionPerYear: '', format: 'Online', accreditation: '',
    pros: '', cons: '', notes: '', deadline: '', website: ''
  });

  function addCollege() {
    if (!newCollege.name.trim()) return;
    const college: College = {
      id: nanoid(),
      name: newCollege.name.trim(),
      location: newCollege.location.trim(),
      type: newCollege.type,
      programName: newCollege.programName.trim(),
      tuitionPerYear: parseFloat(newCollege.tuitionPerYear) || 0,
      format: newCollege.format,
      accreditation: newCollege.accreditation || undefined,
      pros: newCollege.pros ? newCollege.pros.split('\n').filter(Boolean) : [],
      cons: newCollege.cons ? newCollege.cons.split('\n').filter(Boolean) : [],
      notes: newCollege.notes || undefined,
      applied: false,
      deadline: newCollege.deadline || undefined,
      website: newCollege.website || undefined,
      score: 5,
    };
    onChange([...colleges, college]);
    setNewCollege({ name: '', location: '', type: 'public', programName: '', tuitionPerYear: '', format: 'Online', accreditation: '', pros: '', cons: '', notes: '', deadline: '', website: '' });
    setShowForm(false);
  }

  function updateCollege(updated: College) {
    onChange(colleges.map(c => c.id === updated.id ? updated : c));
  }

  function removeCollege(id: string) {
    onChange(colleges.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  const sorted = [...colleges].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">College Comparison</h3>
          <p className="text-sm text-slate-500">Cybersecurity (GRC) · Fall 2026</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add College
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h4 className="font-semibold text-slate-800">Add a College</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="College name *" value={newCollege.name} onChange={e => setNewCollege(p => ({ ...p, name: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Location" value={newCollege.location} onChange={e => setNewCollege(p => ({ ...p, location: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Program name" value={newCollege.programName} onChange={e => setNewCollege(p => ({ ...p, programName: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Tuition per year ($)" type="number" value={newCollege.tuitionPerYear} onChange={e => setNewCollege(p => ({ ...p, tuitionPerYear: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={newCollege.format} onChange={e => setNewCollege(p => ({ ...p, format: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-slate-700">
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={newCollege.type} onChange={e => setNewCollege(p => ({ ...p, type: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-slate-700">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Accreditation (e.g. SACSCOC)" value={newCollege.accreditation} onChange={e => setNewCollege(p => ({ ...p, accreditation: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Application deadline" type="date" value={newCollege.deadline} onChange={e => setNewCollege(p => ({ ...p, deadline: e.target.value }))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-600" />
            <input placeholder="Website URL" value={newCollege.website} onChange={e => setNewCollege(p => ({ ...p, website: e.target.value }))}
              className="sm:col-span-2 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <textarea placeholder="Pros (one per line)" value={newCollege.pros} onChange={e => setNewCollege(p => ({ ...p, pros: e.target.value }))} rows={3}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <textarea placeholder="Cons (one per line)" value={newCollege.cons} onChange={e => setNewCollege(p => ({ ...p, cons: e.target.value }))} rows={3}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <textarea placeholder="Additional notes" value={newCollege.notes} onChange={e => setNewCollege(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="sm:col-span-2 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={addCollege} className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Add College</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* College cards */}
      <div className="space-y-4">
        {sorted.map((college, rank) => {
          const isExpanded = expandedId === college.id;
          return (
            <div
              key={college.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                college.enrolled ? 'border-indigo-300 ring-2 ring-indigo-100' :
                college.accepted ? 'border-emerald-300' : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    rank === 0 ? 'bg-amber-100 text-amber-700' :
                    rank === 1 ? 'bg-slate-100 text-slate-600' :
                    rank === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'
                  }`}>
                    #{rank + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{college.name}</h4>
                          {college.enrolled && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Enrolled</span>}
                          {college.accepted && !college.enrolled && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Accepted</span>}
                          {college.applied && !college.accepted && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Applied</span>}
                        </div>
                        <p className="text-sm text-slate-500">{college.programName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{college.location}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{college.format}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{college.type}</span>
                          {college.accreditation && (
                            <span className="text-xs text-emerald-600">{college.accreditation}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-slate-800">{fmt(college.tuitionPerYear)}</div>
                        <div className="text-xs text-slate-400">per year</div>
                      </div>
                    </div>

                    {/* Score + action buttons */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Score:</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <button
                              key={n}
                              onClick={() => updateCollege({ ...college, score: n })}
                              className={`w-3 h-3 rounded-sm transition-colors ${n <= (college.score ?? 0) ? 'bg-indigo-500' : 'bg-slate-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-indigo-600 ml-1">{college.score ?? 0}/10</span>
                      </div>

                      <div className="flex gap-2 ml-auto">
                        {college.website && (
                          <a href={college.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Visit
                          </a>
                        )}
                        <button
                          onClick={() => updateCollege({ ...college, applied: !college.applied, accepted: college.applied ? undefined : college.accepted })}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${college.applied ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {college.applied ? '✓ Applied' : 'Mark Applied'}
                        </button>
                        {college.applied && (
                          <button
                            onClick={() => updateCollege({ ...college, accepted: !college.accepted, enrolled: college.accepted ? undefined : college.enrolled })}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors ${college.accepted ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {college.accepted ? '✓ Accepted' : 'Mark Accepted'}
                          </button>
                        )}
                        {college.accepted && (
                          <button
                            onClick={() => updateCollege({ ...college, enrolled: !college.enrolled })}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors ${college.enrolled ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {college.enrolled ? '✓ Enrolled' : 'Mark Enrolled'}
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : college.id)}
                          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          {isExpanded ? 'Less' : 'Details'}
                        </button>
                        <button onClick={() => removeCollege(college.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {college.deadline && (
                      <p className="text-xs text-amber-600 mt-1">Deadline: {college.deadline}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-semibold text-emerald-700 mb-1.5 uppercase tracking-wide">Pros</h5>
                    <ul className="space-y-1">
                      {college.pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">Cons</h5>
                    <ul className="space-y-1">
                      {college.cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {college.notes && (
                    <div className="sm:col-span-2">
                      <h5 className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Notes</h5>
                      <textarea
                        value={college.notes}
                        onChange={e => updateCollege({ ...college, notes: e.target.value })}
                        rows={3}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-slate-700"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {colleges.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No colleges added yet. Pre-populated options are loaded with your defaults.</p>
          </div>
        )}
      </div>
    </div>
  );
}
