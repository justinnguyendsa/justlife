import { useCallback } from 'react';
import type { Habit, HabitLog, HabitFrequency, HabitCategory } from '../types';
import { useLocalStorage } from './useLocalStorage';

const HABITS_KEY = 'justlife_habits';
const LOGS_KEY = 'justlife_habit_logs';

const todayStr = () => new Date().toISOString().split('T')[0];

export const useHabitStore = () => {
  const [habits, setHabits] = useLocalStorage<Habit[]>(HABITS_KEY, []);
  const [logs, setLogs] = useLocalStorage<HabitLog[]>(LOGS_KEY, []);

  const addHabit = useCallback((
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
    setHabits((prev) => [...prev, newHabit]);
  }, [setHabits]);

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => prev.filter((l) => l.habitId !== id));
  }, [setHabits, setLogs]);

  const archiveHabit = useCallback((id: string) => {
    setHabits((prev) => prev.map((h) => h.id === id ? { ...h, archived: true } : h));
  }, [setHabits]);

  const toggleLog = useCallback((habitId: string, date: string) => {
    setLogs((prev) => {
      const existing = prev.find((l) => l.habitId === habitId && l.date === date);
      if (existing) {
        return prev.map((l) =>
          l.habitId === habitId && l.date === date
            ? { ...l, done: !l.done }
            : l
        );
      }
      return [...prev, { habitId, date, done: true }];
    });
  }, [setLogs]);

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

  const getCompletedDaysInMonth = useCallback((habitId: string, year: number, month: number): string[] => {
    return logs
      .filter((l) => {
        if (l.habitId !== habitId || !l.done) return false;
        const [y, m] = l.date.split('-').map(Number);
        return y === year && m === month;
      })
      .map((l) => l.date);
  }, [logs]);

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
