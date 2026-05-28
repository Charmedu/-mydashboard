'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface CalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
}

interface Props {
  weekStart: string;
}

const EVENT_COLORS: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d60000', default: '#d4b0a8',
};

export default function CalendarEvents({ weekStart }: Props) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const start = parseISO(weekStart);
      const end = addDays(start, 7);
      const res = await fetch(
        `/api/calendar?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
      );
      if (res.status === 401) { setError('session-expired'); return; }
      if (res.status === 403) { setError('no-access'); return; }
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setEvents(data);
    } catch {
      setError('error');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEvents(); }, [weekStart]);

  if (error === 'session-expired' || error === 'no-access') {
    return (
      <div className="rd-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-[3px] h-4 bg-rd-accent rounded-full flex-shrink-0" />
          <h3 className="font-semibold text-rd-text text-sm">Calendar</h3>
        </div>
        <div className="text-center py-4 space-y-2">
          <AlertCircle className="w-7 h-7 text-rd-accent mx-auto" />
          <p className="text-sm text-rd-text">
            {error === 'session-expired' ? 'Session expired.' : 'Calendar access not granted.'}
          </p>
          <p className="text-xs text-rd-muted">Sign out and sign in again to restore access.</p>
        </div>
      </div>
    );
  }

  const groupedByDay: Record<string, CalEvent[]> = {};
  events.forEach(ev => {
    const dateStr = ev.start.dateTime
      ? format(parseISO(ev.start.dateTime), 'yyyy-MM-dd')
      : (ev.start.date ?? '');
    if (!groupedByDay[dateStr]) groupedByDay[dateStr] = [];
    groupedByDay[dateStr].push(ev);
  });

  const days = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd')
  );

  return (
    <div className="rd-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 bg-rd-accent rounded-full flex-shrink-0" />
          <h3 className="font-semibold text-rd-text text-sm">Calendar</h3>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="text-rd-muted hover:text-rd-text transition-colors duration-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-sm text-rd-muted">Loading events…</div>
      ) : events.length === 0 ? (
        <p className="text-rd-muted text-sm text-center py-3">No events this week.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
          {days.map(day => {
            const dayEvents = groupedByDay[day];
            if (!dayEvents?.length) return null;
            return (
              <div key={day}>
                <p className="text-xs font-semibold text-rd-muted mb-1">
                  {format(parseISO(day), 'EEE, MMM d')}
                </p>
                <div className="space-y-1">
                  {dayEvents.map(ev => {
                    const color = EVENT_COLORS[ev.colorId ?? 'default'] ?? EVENT_COLORS.default;
                    const time = ev.start.dateTime
                      ? format(parseISO(ev.start.dateTime), 'h:mm a')
                      : 'All day';
                    return (
                      <div key={ev.id} className="flex items-start gap-2 text-xs">
                        <div
                          className="w-1 min-h-[1.25rem] rounded-full flex-shrink-0 mt-0.5"
                          style={{ background: color }}
                        />
                        <div>
                          <span className="font-medium text-rd-text">{ev.summary ?? '(No title)'}</span>
                          <span className="text-rd-muted ml-1.5">{time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
