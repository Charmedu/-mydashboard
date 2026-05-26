'use client';

import { format, parseISO } from 'date-fns';
import { Mail, GraduationCap } from 'lucide-react';
import type { UniversityEmail } from '@/lib/types';

interface Props {
  emails: UniversityEmail[];
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.replace(/<.*>/, '').trim();
}

export default function UniversityEmails({ emails }: Props) {
  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-slate-800">University Emails</h3>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">
          University emails will appear here after Eva scans your Gmail.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-4 h-4 text-indigo-500" />
        <h3 className="font-semibold text-slate-800">University Emails</h3>
        <span className="ml-auto text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5">
          {emails.length}
        </span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
        {emails.map(email => (
          <div key={email.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
            <Mail className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{truncate(email.subject, 55)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {senderName(email.from)} · {format(parseISO(email.receivedAt), 'MMM d, h:mm a')}
              </p>
              {email.snippet && (
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{truncate(email.snippet, 70)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
