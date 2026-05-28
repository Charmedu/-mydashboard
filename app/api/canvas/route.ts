import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CANVAS_BASE = 'https://canvas.tccd.edu/api/v1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function canvasFetch(path: string): Promise<any[]> {
  const raw = process.env.CANVAS_API_TOKEN;
  if (!raw) throw new Error('CANVAS_API_TOKEN is not configured');

  // Strip whitespace and any characters outside the printable ASCII range
  // that are illegal in HTTP header values (common when copy-pasting tokens).
  const token = raw.replace(/[^\x21-\x7e]/g, '').trim();
  if (!token) throw new Error('CANVAS_API_TOKEN is empty after sanitization — check for stray whitespace or encoding issues');

  const res = await fetch(`${CANVAS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401) throw new Error('Invalid Canvas API token — check CANVAS_API_TOKEN');
  if (res.status === 404) throw new Error('Canvas URL not found — check canvas.tccd.edu is correct');
  if (!res.ok) throw new Error(`Canvas API returned ${res.status}`);

  return res.json();
}

export async function GET() {
  try {
    // Fetch active student courses with grade scores and term info
    const rawCourses = await canvasFetch(
      '/courses?enrollment_state=active&include[]=total_scores&include[]=term&per_page=100'
    );

    // Keep only courses where the user is a student (not TA/observer/etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courses = rawCourses.filter((c: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray(c.enrollments) && c.enrollments.some((e: any) => e.type === 'student')
    );

    // Fetch upcoming assignments for every course in parallel
    const coursePayloads = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      courses.map(async (c: any) => {
        try {
          const assignments = await canvasFetch(
            `/courses/${c.id}/assignments?bucket=upcoming&order_by=due_at&include[]=submission&per_page=100`
          );
          return { course: c, assignments };
        } catch {
          return { course: c, assignments: [] };
        }
      })
    );

    return NextResponse.json({ courses: coursePayloads, syncedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
