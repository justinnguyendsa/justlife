import { useState, useEffect } from 'react';

export type Role = 'WORK' | 'TEACH' | 'MASTER';

export interface Task {
  id: string;
  title: string;
  role: Role;
  deadline: string;
  createdAt: number;
  completed: boolean;
}

export const useTaskStore = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('justlife_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('justlife_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (title: string, role: Role, deadline: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      role,
      deadline,
      createdAt: Date.now(),
      completed: false,
    };
    setTasks(prev => [...prev, newTask]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return { tasks, addTask, toggleTask, deleteTask };
};
