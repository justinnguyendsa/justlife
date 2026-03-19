export type Role = 'WORK' | 'TEACH' | 'MASTER';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  title: string;
  role: Role;
  priority: Priority;
  deadline: string; // ISO date string (soft deadline, already -3 days)
  notes: string;
  createdAt: number;
  completed: boolean;
}

export interface DailyStats {
  total: number;
  completed: number;
  overdue: number;
  today: number;
}

export type HabitFrequency = 'daily' | 'weekly';
export type HabitCategory = 'health' | 'learning' | 'mindfulness' | 'productivity' | 'other';

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  category: HabitCategory;
  targetDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (for weekly habits, all days = [] means every day)
  createdAt: number;
  archived: boolean;
}

export interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  note?: string;
}

// ─── TEACHING HUB MODELS ────────────────────────────────────────────────────────
export interface Class {
  id: string; // uuid
  name: string; // e.g. "Toán ứng dụng K1"
  courseCode: string; // e.g. "MATH101"
  description?: string;
  scheduleRules: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: number;
}

export interface Student {
  id: string; // uuid
  classIds: string[]; // Mảng Lớp học thay vì 1 class
  name: string;
  studentCode: string;
  email?: string;
  phone?: string;
  status: 'ACTIVE' | 'DROPPED';
  joinedAt: number;
}

export interface Attendance {
  id: string; // uuid
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD (ngày điểm danh)
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  note?: string;
}

export interface Assignment {
  id: string; // uuid
  classId: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  points?: number; // Điểm tối đa (10, 100...)
  createdAt: number;
}

export interface Submission {
  id: string; // uuid
  assignmentId: string;
  studentId: string;
  submittedAt?: number; // TS (nếu học viên chưa nộp thì undefined)
  attachmentUrl?: string;
  score?: number;
  feedback?: string;
  isMarked: boolean;
}
export interface TeachingDoc {
  id: string; // uuid
  classIds: string[]; // Nhiều lớp
  title: string;
  url: string;
  description?: string;
  createdAt: number;
}
// ─── STUDYING HUB MODELS ─────────────────────────────────────────────────────────
export interface StudyCourse {
  id: string; // uuid
  name: string;
  courseCode: string; // e.g. "SOFT501"
  description?: string;
  lmsUrl?: string; // Link to university LMS
  scheduleRules: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: number;
}

export interface StudyAssignment {
  id: string; // uuid
  courseId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date-time string
  priority: Priority;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  weight?: number; // % of total grade
  points?: number; // Grade received
  createdAt: number;
}

export type StudyDocType = 'SLIDE' | 'BOOK' | 'REFERENCE' | 'MY_NOTES';

export interface StudyDoc {
  id: string; // uuid
  courseId: string;
  title: string;
  url: string;
  type: StudyDocType;
  description?: string;
  createdAt: number;
}

// ─── WORKING HUB (JIRA STYLE) ──────────────────────────────────────────────────
export type IssueStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type IssueType = 'STORY' | 'TASK' | 'BUG' | 'EPIC';

export interface WorkingProject {
  id: string; // uuid
  key: string; // e.g., "PROJ"
  name: string;
  description?: string;
  lead: string; // User Name
  createdAt: number;
}

export interface WorkingIssue {
  id: string; // uuid
  projectId: string;
  key: string; // e.g., "PROJ-1"
  title: string;
  description?: string;
  status: IssueStatus;
  priority: Priority;
  type: IssueType;
  epicId?: string; // If this belongs to an epic
  createdAt: number;
  updatedAt: number;
  dueDate?: string; // YYYY-MM-DD
}
