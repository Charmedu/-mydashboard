export interface Task {
  id: string;
  text: string;
  done: boolean;
  category?: string;
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

export interface DashboardData {
  weekly: WeeklyData;
  quarterly: QuarterlyData;
  books: Book[];
  bucketList: BucketItem[];
  school: SchoolData;
  lastSaved?: string;
}
