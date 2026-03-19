import Dexie, { type Table } from 'dexie';
import type { Task, Habit, HabitLog, Class, Student, Attendance } from '../types';

export class JustLifeDB extends Dexie {
  tasks!: Table<Task, string>;
  habits!: Table<Habit, string>;
  // We use a generated string ID for habitLogs to avoid composite primary key tricky issues: "habitId_date"
  habitLogs!: Table<HabitLog & { id: string }, string>;
  classes!: Table<Class, string>;
  students!: Table<Student, string>;
  attendances!: Table<Attendance, string>;

  constructor() {
    super('JustLifeDB');
    this.version(1).stores({
      tasks: 'id, role, priority, deadline, completed, createdAt',
      habits: 'id, archived, createdAt',
      habitLogs: 'id, habitId, date, done',
      classes: 'id, courseCode, createdAt',
      students: 'id, classId, studentCode, status',
      attendances: 'id, classId, studentId, date'
    });
  }
}

export const db = new JustLifeDB();

// ─── BACKGROUND MIGRATION SERVICE ───────────────────────────────────────────
export async function migrateFromLocalStorage() {
  const migrated = localStorage.getItem('justlife_migrated_dexie');
  if (migrated === 'true') return;

  console.log('🔄 Init Dexie: Migrating data from localStorage to IndexedDB...');
  
  try {
    // 1. Migrate Tasks
    const lsTasksRaw = localStorage.getItem('justlife_tasks');
    if (lsTasksRaw) {
      const lsTasks: Task[] = JSON.parse(lsTasksRaw);
      if (lsTasks.length > 0) await db.tasks.bulkPut(lsTasks);
    }

    // 2. Migrate Habits
    const lsHabitsRaw = localStorage.getItem('justlife_habits');
    if (lsHabitsRaw) {
      const lsHabits: Habit[] = JSON.parse(lsHabitsRaw);
      if (lsHabits.length > 0) await db.habits.bulkPut(lsHabits);
    }

    // 3. Migrate Habit Logs
    const lsLogsRaw = localStorage.getItem('justlife_habit_logs');
    if (lsLogsRaw) {
      const lsLogs: HabitLog[] = JSON.parse(lsLogsRaw);
      if (lsLogs.length > 0) {
        const enrichedLogs = lsLogs.map(l => ({
          ...l,
          id: `${l.habitId}_${l.date}`
        }));
        await db.habitLogs.bulkPut(enrichedLogs);
      }
    }

    // Mark as migrated
    localStorage.setItem('justlife_migrated_dexie', 'true');
    console.log('✅ Migration to IndexedDB completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}
