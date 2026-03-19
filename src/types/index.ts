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
  classId: string; // link to Class
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
