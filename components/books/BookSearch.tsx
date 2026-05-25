'use client';

import { useState } from 'react';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import { Book } from '@/lib/types';

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

interface Props {
  onAdd: (book: Omit<Book, 'id' | 'status'>) => void;
  onClose: () => void;
}

export default function BookSearch({ onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OLDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.docs ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(doc: OLDoc) {
    onAdd({
      title: doc.title,
      author: doc.author_name?.[0] ?? 'Unknown Author',
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
      olKey: doc.key,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Search Open Library</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by title, author, ISBN…"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700"
            autoFocus
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto scrollbar-thin">
          {results.map(doc => (
            <div
              key={doc.key}
              className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 hover:border-indigo-300 transition-colors"
            >
              {doc.cover_i ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`}
                  alt={doc.title}
                  className="w-full h-32 object-cover rounded shadow-sm"
                />
              ) : (
                <div className="w-full h-32 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs text-center px-2">
                  No cover
                </div>
              )}
              <div className="flex-1 min-h-0">
                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">{doc.title}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{doc.author_name?.[0] ?? 'Unknown'}</p>
                {doc.first_publish_year && (
                  <p className="text-xs text-slate-400">{doc.first_publish_year}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(doc)}
                className="flex items-center justify-center gap-1 w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          ))}
        </div>
      ) : searched && !loading ? (
        <p className="text-center text-slate-400 py-6">No books found. Try a different search.</p>
      ) : null}
    </div>
  );
}
