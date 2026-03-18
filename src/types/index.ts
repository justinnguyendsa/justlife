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
