import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Habit, HabitFrequency, HabitCategory } from '../types';

const todayStr = () => new Date().toISOString().split('T')[0];

export const useHabitStore = () => {
  const liveHabits = useLiveQuery(() => db.habits.toArray());
  const habits = liveHabits ?? [];

  const liveLogs = useLiveQuery(() => db.habitLogs.toArray());
  const logs = liveLogs ?? [];

  const addHabit = useCallback(
    async (
      name: string,
      icon: string,
      color: string,
      frequency: HabitFrequency,
      category: HabitCategory,
      description = '',
      targetDays: number[] = []
    ) => {
      const newHabit: Habit = {
        id: crypto.randomUUID(),
        name,
        description,
        icon,
        color,
        frequency,
        category,
        targetDays,
        createdAt: Date.now(),
        archived: false,
      };
      await db.habits.add(newHabit);
    },
    []
  );

  const deleteHabit = useCallback(async (id: string) => {
    await db.transaction('rw', db.habits, db.habitLogs, async () => {
      await db.habits.delete(id);
      // Delete all logs for this habit
      const logsToDelete = await db.habitLogs.where({ habitId: id }).primaryKeys();
      await db.habitLogs.bulkDelete(logsToDelete);
    });
  }, []);

  const archiveHabit = useCallback(async (id: string) => {
    await db.habits.update(id, { archived: true });
  }, []);

  const toggleLog = useCallback(async (habitId: string, date: string) => {
    const logId = `${habitId}_${date}`;
    const existing = await db.habitLogs.get(logId);
    if (existing) {
      await db.habitLogs.update(logId, { done: !existing.done });
    } else {
      await db.habitLogs.add({ id: logId, habitId, date, done: true });
    }
  }, []);

  const isDone = useCallback((habitId: string, date: string): boolean => {
    return logs.some((l) => l.habitId === habitId && l.date === date && l.done);
  }, [logs]);

  const getStreak = useCallback((habitId: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let cursor = new Date(today);
    while (true) {
      const dateKey = cursor.toISOString().split('T')[0];
      const done = logs.some((l) => l.habitId === habitId && l.date === dateKey && l.done);
      if (!done) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [logs]);

  const getCompletedDaysInMonth = useCallback(
    (habitId: string, year: number, month: number): string[] => {
      return logs
        .filter((l) => {
          if (l.habitId !== habitId || !l.done) return false;
          const [y, m] = l.date.split('-').map(Number);
          return y === year && m === month;
        })
        .map((l) => l.date);
    },
    [logs]
  );

  const getTodayCompleted = useCallback((): number => {
    const today = todayStr();
    return habits.filter((h) => !h.archived && isDone(h.id, today)).length;
  }, [habits, isDone]);

  const getActiveHabits = useCallback(() => {
    return habits.filter((h) => !h.archived);
  }, [habits]);

  return {
    habits: getActiveHabits(),
    allHabits: habits,
    logs,
    addHabit,
    deleteHabit,
    archiveHabit,
    toggleLog,
    isDone,
    getStreak,
    getCompletedDaysInMonth,
    getTodayCompleted,
  };
};
