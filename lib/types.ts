export interface Task {
  id: string;
  text: string;
  done: boolean;
  category?: string;
  dueDate?: string; // ISO datetime, set when rescheduled via Eva
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  section: 'daily' | 'other';
  weeklyGoal: number; // 1–7
  completions: Record<string, boolean[]>; // weekOf ISO date → [Mon…Sun]
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  notes?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  balance: number;
  limit: number;
  apr: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  color: string;
}

export type ReadingStatus = 'want-to-read' | 'reading' | 'finished' | 'dnf';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  olKey?: string;
  status: ReadingStatus;
  rating?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export type BucketCategory = 'Travel' | 'Experience' | 'Career' | 'Personal' | 'Health' | 'Creative' | 'Financial';

export interface BucketItem {
  id: string;
  text: string;
  category: BucketCategory;
  done: boolean;
  notes?: string;
  targetDate?: string;
}

export interface Assignment {
  id: string;
  name: string;
  due: string;
  weight?: number;
  grade?: number;
  submitted: boolean;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  grade?: string;
  gradePoints?: number;
  assignments: Assignment[];
  notes?: string;
}

export interface Semester {
  id: string;
  name: string;
  courses: Course[];
  gpa?: number;
}

export interface RemainingCourse {
  id: string;
  name: string;
  code: string;
  credits: number;
  category: string;
  completed: boolean;
  plannedSemester?: string;
  notes?: string;
}

export interface College {
  id: string;
  name: string;
  location: string;
  type: string;
  programName: string;
  tuitionPerYear: number;
  format: string;
  accreditation?: string;
  pros: string[];
  cons: string[];
  notes?: string;
  applied: boolean;
  accepted?: boolean;
  enrolled?: boolean;
  deadline?: string;
  score?: number;
  website?: string;
}

export interface WeeklyData {
  weekOf: string;
  tasks: Task[];
  habits: Habit[];
  focus: string;
  goals: string[];
}

export interface Achievement {
  id: string;
  text: string;
  date: string; // ISO date
}

export interface ParkingItem {
  id: string;
  text: string;
  addedAt: string; // ISO date
}

export interface QuarterlyData {
  quarter: string;
  goals: {
    finance: Goal[];
    health: Goal[];
    school: Goal[];
    personal: Goal[];
  };
  finances: {
    creditCards: CreditCard[];
    savings: SavingsGoal[];
    monthlyIncome?: number;
    monthlyExpenses?: number;
  };
  achievements: Achievement[];
  parkingLot: ParkingItem[];
}

export interface SchoolData {
  semesters: Semester[];
  remainingCourses: RemainingCourse[];
  colleges: College[];
  targetDegree: string;
  currentInstitution?: string;
  totalCreditsRequired: number;
  completedCredits: number;
}

export interface MoodEntry {
  id: string;
  date: string; // "yyyy-MM-dd"
  score: number; // 1–5
}

export interface JournalEntry {
  id: string;
  text: string;
  timestamp: string; // ISO datetime
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string; // "yyyy-MM-dd"
}

export interface Reminder {
  id: string;
  text: string;
  dueAt: string; // ISO datetime
  sent: boolean;
  createdAt: string;
}

export interface SavedArticle {
  id: string;
  url: string;
  title?: string;
  savedAt: string;
}

export interface UniversityEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  threadId?: string;      // Gmail thread ID, for reply threading
  messageId?: string;     // RFC 2822 Message-ID header, for In-Reply-To
  needsResponse?: boolean;
}

export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: string; // ISO datetime when last shared via Telegram
}

export interface DashboardData {
  weekly: WeeklyData;
  quarterly: Record<string, QuarterlyData>; // keyed by "YYYY-QN"
  books: Book[];
  bucketList: BucketItem[];
  school: SchoolData;
  mood: MoodEntry[];
  journal: JournalEntry[];
  expenses: Expense[];
  reminders: Reminder[];
  savedArticles: SavedArticle[];
  universityEmails: UniversityEmail[];
  lastLocation?: UserLocation; // most recent Telegram location share
  lastSaved?: string;
}
