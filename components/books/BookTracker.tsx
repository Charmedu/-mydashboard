'use client';

import { useState } from 'react';
import { Book, ReadingStatus } from '@/lib/types';
import { Search, BookOpen, Trash2, Star } from 'lucide-react';
import BookSearch from './BookSearch';
import { nanoid } from '@/lib/nanoid';

interface Props {
  books: Book[];
  onChange: (books: Book[]) => void;
}

const STATUS_LABELS: Record<ReadingStatus, string> = {
  'want-to-read': 'Want to Read',
  'reading': 'Reading',
  'finished': 'Finished',
  'dnf': 'Did Not Finish',
};

const STATUS_COLORS: Record<ReadingStatus, string> = {
  'want-to-read': 'bg-slate-100 text-slate-600',
  'reading': 'bg-blue-100 text-blue-700',
  'finished': 'bg-emerald-100 text-emerald-700',
  'dnf': 'bg-red-100 text-red-700',
};

const STATUSES: ReadingStatus[] = ['reading', 'want-to-read', 'finished', 'dnf'];

export default function BookTracker({ books, onChange }: Props) {
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<ReadingStatus | 'all'>('all');
  const [editNotes, setEditNotes] = useState<string | null>(null);

  function addBook(book: Omit<Book, 'id' | 'status'>) {
    onChange([...books, { ...book, id: nanoid(), status: 'want-to-read' }]);
    setShowSearch(false);
  }

  function updateStatus(id: string, status: ReadingStatus) {
    onChange(books.map(b => b.id === id ? {
      ...b,
      status,
      startDate: status === 'reading' && !b.startDate ? new Date().toISOString().split('T')[0] : b.startDate,
      endDate: (status === 'finished' || status === 'dnf') && !b.endDate ? new Date().toISOString().split('T')[0] : b.endDate,
    } : b));
  }

  function updateRating(id: string, rating: number) {
    onChange(books.map(b => b.id === id ? { ...b, rating } : b));
  }

  function updateNotes(id: string, notes: string) {
    onChange(books.map(b => b.id === id ? { ...b, notes } : b));
  }

  function removeBook(id: string) {
    onChange(books.filter(b => b.id !== id));
  }

  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter);
  const counts = Object.fromEntries(STATUSES.map(s => [s, books.filter(b => b.status === s).length])) as Record<ReadingStatus, number>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Book Tracker</h2>
          <p className="text-slate-500 text-sm">{books.length} books tracked</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          <Search className="w-4 h-4" />
          Search Books
        </button>
      </div>

      {showSearch && (
        <BookSearch onAdd={addBook} onClose={() => setShowSearch(false)} />
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          All ({books.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Book grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No books here yet. Search to add some!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(book => (
            <div key={book.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
              <div className="flex gap-3 p-4">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-12 h-16 object-cover rounded flex-shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-16 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">{book.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{book.author}</p>
                  <div className="mt-2">
                    <select
                      value={book.status}
                      onChange={e => updateStatus(book.id, e.target.value as ReadingStatus)}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${STATUS_COLORS[book.status]}`}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="px-4 pb-3 space-y-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => updateRating(book.id, n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className="w-4 h-4"
                        fill={n <= (book.rating ?? 0) ? '#f59e0b' : 'none'}
                        stroke={n <= (book.rating ?? 0) ? '#f59e0b' : '#cbd5e1'}
                      />
                    </button>
                  ))}
                </div>

                {editNotes === book.id ? (
                  <div>
                    <textarea
                      defaultValue={book.notes}
                      onBlur={e => { updateNotes(book.id, e.target.value); setEditNotes(null); }}
                      autoFocus
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                      placeholder="Notes…"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setEditNotes(book.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 text-left w-full truncate"
                  >
                    {book.notes || 'Add notes…'}
                  </button>
                )}

                <div className="flex justify-between items-center">
                  {book.startDate && (
                    <span className="text-xs text-slate-400">Started {book.startDate}</span>
                  )}
                  <button
                    onClick={() => removeBook(book.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
