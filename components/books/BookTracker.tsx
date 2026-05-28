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
  'reading':      'Reading',
  'finished':     'Finished',
  'dnf':          'Did Not Finish',
};

const STATUS_COLORS: Record<ReadingStatus, string> = {
  'want-to-read': 'bg-rd-bg text-rd-muted',
  'reading':      'bg-blue-100 text-blue-700',
  'finished':     'bg-emerald-100 text-emerald-700',
  'dnf':          'bg-red-100 text-red-600',
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
      ...b, status,
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
          <h2 className="font-display text-2xl font-bold text-rd-text tracking-tight">Book Tracker</h2>
          <p className="text-rd-muted text-sm">{books.length} books tracked</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="rd-btn text-sm px-4 py-2"
        >
          <Search className="w-4 h-4" /> Search Books
        </button>
      </div>

      {showSearch && <BookSearch onAdd={addBook} onClose={() => setShowSearch(false)} />}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
            filter === 'all' ? 'bg-rd-text text-rd-bg' : 'rd-btn-ghost'
          }`}
        >
          All ({books.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              filter === s ? 'bg-rd-text text-rd-bg' : 'rd-btn-ghost'
            }`}
          >
            {STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-rd-muted">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No books here yet. Search to add some!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(book => (
            <div key={book.id} className="rd-card overflow-hidden group">
              <div className="flex gap-3 p-4">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt={book.title}
                    className="w-12 h-16 object-cover rounded flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-12 h-16 bg-rd-bg border border-rd-border rounded flex-shrink-0 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-rd-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-rd-text text-sm leading-tight line-clamp-2">{book.title}</h4>
                  <p className="text-xs text-rd-muted mt-0.5 truncate">{book.author}</p>
                  <div className="mt-2">
                    <select
                      value={book.status}
                      onChange={e => updateStatus(book.id, e.target.value as ReadingStatus)}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 focus:outline-none focus:ring-2 focus:ring-rd-accent cursor-pointer ${STATUS_COLORS[book.status]}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-3 space-y-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => updateRating(book.id, n)} className="transition-transform hover:scale-110">
                      <Star
                        className="w-4 h-4"
                        fill={n <= (book.rating ?? 0) ? '#d4b0a8' : 'none'}
                        stroke={n <= (book.rating ?? 0) ? '#d4b0a8' : '#ead8d0'}
                      />
                    </button>
                  ))}
                </div>

                {editNotes === book.id ? (
                  <textarea
                    defaultValue={book.notes}
                    onBlur={e => { updateNotes(book.id, e.target.value); setEditNotes(null); }}
                    autoFocus
                    rows={3}
                    className="rd-input text-xs resize-none"
                    placeholder="Notes…"
                  />
                ) : (
                  <button
                    onClick={() => setEditNotes(book.id)}
                    className="text-xs text-rd-muted hover:text-rd-text text-left w-full truncate transition-colors duration-200"
                  >
                    {book.notes || 'Add notes…'}
                  </button>
                )}

                <div className="flex justify-between items-center">
                  {book.startDate && (
                    <span className="text-xs text-rd-muted">Started {book.startDate}</span>
                  )}
                  <button
                    onClick={() => removeBook(book.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-rd-muted hover:text-red-400 transition-all"
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
