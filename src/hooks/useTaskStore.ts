import { useCallback } from 'react';
import type { Task, Role, Priority } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { useSettingsStore } from './useSettingsStore';

const STORAGE_KEY = 'justlife_tasks';

function migrateTasks(raw: unknown[]): Task[] {
  return raw.map((t: unknown) => {
    const task = t as Partial<Task>;
    return {
      id: task.id ?? crypto.randomUUID(),
      title: task.title ?? '',
      role: (task.role as Role) ?? 'WORK',
      priority: (task.priority as Priority) ?? 'MEDIUM',
      deadline: task.deadline ?? '',
      notes: task.notes ?? '',
      createdAt: task.createdAt ?? Date.now(),
      completed: task.completed ?? false,
    };
  });
}

export const useTaskStore = () => {
  const [rawTasks, setRawTasks] = useLocalStorage<unknown[]>(STORAGE_KEY, []);
  const { settings } = useSettingsStore();
  const tasks: Task[] = migrateTasks(rawTasks);

  const setTasks = (updater: (prev: Task[]) => Task[]) => {
    setRawTasks((prev) => updater(migrateTasks(prev)));
  };

  const addTask = useCallback(
    (
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
      setRawTasks((prev) => [...(prev as Task[]), newTask]);
    },
    [setRawTasks]
  );

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTask = useCallback((id: string, partial: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...partial } : t))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTasksByDate = useCallback(
    (dateStr: string) => {
      return tasks.filter((t) => t.deadline === dateStr && !t.completed);
    },
    [tasks]
  );

  const getTodayTasks = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => t.deadline === today && !t.completed);
  }, [tasks]);

  const getOverdueTasks = useCallback(() => {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    return tasks.filter(
      (t) => {
        if (!t.deadline || t.completed) return false;
        const d = new Date(t.deadline);
        return d < todayObj;
      }
    );
  }, [tasks]);

  const getUpcomingTasks = useCallback(() => {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    return tasks.filter(
      (t) => {
        if (!t.deadline || t.completed) return false;
        const exactDeadline = new Date(t.deadline);
        if (exactDeadline < todayObj) return false; // Already overdue

        const softDeadline = new Date(t.deadline);
        softDeadline.setDate(softDeadline.getDate() - settings.softDeadlineOffset);
        
        return softDeadline <= todayObj;
      }
    );
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
