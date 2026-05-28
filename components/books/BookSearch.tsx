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
    <div className="rd-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-rd-text">Search Open Library</h3>
        <button onClick={onClose} className="text-rd-muted hover:text-rd-text transition-colors duration-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rd-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by title, author, ISBN…"
            className="rd-input pl-9"
            autoFocus
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="rd-btn px-4 py-2.5 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-rd-accent" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto scrollbar-thin">
          {results.map(doc => (
            <div
              key={doc.key}
              className="border border-rd-border rounded-[10px] p-3 flex flex-col gap-2 hover:border-rd-accent transition-colors duration-200 hover:shadow-card"
            >
              {doc.cover_i ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`}
                  alt={doc.title}
                  className="w-full h-32 object-cover rounded shadow-sm"
                />
              ) : (
                <div className="w-full h-32 bg-rd-bg rounded flex items-center justify-center text-rd-muted text-xs text-center px-2 border border-rd-border">
                  No cover
                </div>
              )}
              <div className="flex-1 min-h-0">
                <p className="text-xs font-semibold text-rd-text line-clamp-2 leading-tight">{doc.title}</p>
                <p className="text-xs text-rd-muted truncate mt-0.5">{doc.author_name?.[0] ?? 'Unknown'}</p>
                {doc.first_publish_year && (
                  <p className="text-xs text-rd-muted">{doc.first_publish_year}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(doc)}
                className="rd-btn w-full py-1.5 text-xs justify-center"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          ))}
        </div>
      ) : searched && !loading ? (
        <p className="text-center text-rd-muted py-6">No books found. Try a different search.</p>
      ) : null}
    </div>
  );
}
