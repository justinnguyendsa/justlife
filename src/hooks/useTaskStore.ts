import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Task, Role, Priority } from '../types';
import { useSettingsStore } from './useSettingsStore';

export const useTaskStore = () => {
  const { settings } = useSettingsStore();

  // Load live data from Dexie. The second parameter is the default value until the query resolves.
  const liveTasks = useLiveQuery(() => db.tasks.toArray());
  const tasks = liveTasks ?? [];

  const addTask = useCallback(
    async (
      title: string,
      role: Role,
      deadline: string,
      priority: Priority = 'MEDIUM',
      notes = ''
    ) => {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title,
        role,
        priority,
        deadline,
        notes,
        createdAt: Date.now(),
        completed: false,
      };
      await db.tasks.add(newTask);
    },
    []
  );

  const toggleTask = useCallback(async (id: string) => {
    const task = await db.tasks.get(id);
    if (task) {
      await db.tasks.update(id, { completed: !task.completed });
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await db.tasks.delete(id);
  }, []);

  const updateTask = useCallback(async (id: string, partial: Partial<Task>) => {
    await db.tasks.update(id, partial);
  }, []);

  // Derived queries kept as useCallback to maintain pure UI component integration
  const getTasksByDate = useCallback(
    (dateStr: string) => tasks.filter((t) => t.deadline === dateStr && !t.completed),
    [tasks]
  );

  const getTodayTasks = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => t.deadline === today && !t.completed);
  }, [tasks]);

  const getOverdueTasks = useCallback(() => {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (!t.deadline || t.completed) return false;
      const d = new Date(t.deadline);
      return d < todayObj;
    });
  }, [tasks]);

  const getUpcomingTasks = useCallback(() => {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (!t.deadline || t.completed) return false;
      const exactDeadline = new Date(t.deadline);
      if (exactDeadline < todayObj) return false; // Already overdue

      const softDeadline = new Date(t.deadline);
      softDeadline.setDate(softDeadline.getDate() - settings.softDeadlineOffset);
      return softDeadline <= todayObj;
    });
  }, [tasks, settings.softDeadlineOffset]);

  return {
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    getTasksByDate,
    getTodayTasks,
    getOverdueTasks,
    getUpcomingTasks,
  };
};
