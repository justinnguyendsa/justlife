import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Class, Student, Task } from '../types';

export const useTeachingStore = () => {
  const classes = useLiveQuery(() => db.classes.toArray()) ?? [];
  const students = useLiveQuery(() => db.students.toArray()) ?? [];
  const attendances = useLiveQuery(() => db.attendances.toArray()) ?? [];

  const addClass = useCallback(
    async (
      name: string,
      courseCode: string,
      description: string,
      scheduleRules: number[],
      startDate: string,
      endDate: string
    ) => {
      const newClass: Class = {
        id: crypto.randomUUID(),
        name,
        courseCode,
        description,
        scheduleRules,
        startDate,
        endDate,
        createdAt: Date.now(),
      };
      
      await db.transaction('rw', db.classes, db.tasks, async () => {
        await db.classes.add(newClass);
        
        // 🔄 Task Sync Engine (generate tasks auto)
        const tasks: Task[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const cursor = new Date(start);
        
        while (cursor <= end) {
          if (scheduleRules.includes(cursor.getDay())) {
             tasks.push({
               id: crypto.randomUUID(),
               title: `🎓 Lịch dạy: ${name} (${courseCode})`,
               role: 'TEACH',
               priority: 'HIGH',
               deadline: cursor.toISOString().split('T')[0],
               notes: 'Lịch tự động sinh từ Quản lý Lớp học',
               createdAt: Date.now(),
               completed: false
             });
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        
        if (tasks.length > 0) {
          await db.tasks.bulkAdd(tasks);
        }
      });
    },
    []
  );

  const deleteClass = useCallback(async (id: string) => {
    await db.transaction('rw', db.classes, db.students, db.attendances, async () => {
      await db.classes.delete(id);
      
      const studentsToDelete = await db.students.where({ classId: id }).primaryKeys();
      if (studentsToDelete.length > 0) await db.students.bulkDelete(studentsToDelete);
      
      const attsToDelete = await db.attendances.where({ classId: id }).primaryKeys();
      if (attsToDelete.length > 0) await db.attendances.bulkDelete(attsToDelete);
    });
  }, []);

  const addStudent = useCallback(async (classId: string, name: string, studentCode: string, email?: string) => {
    const s: Student = {
      id: crypto.randomUUID(),
      classId,
      name,
      studentCode,
      email,
      status: 'ACTIVE',
      joinedAt: Date.now()
    };
    await db.students.add(s);
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    await db.students.delete(id);
  }, []);

  const toggleAttendance = useCallback(async (classId: string, studentId: string, date: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    const all = await db.attendances.where({ classId, studentId }).toArray();
    const existing = all.find(x => x.date === date);

    if (existing) {
       await db.attendances.update(existing.id, { status });
    } else {
       await db.attendances.add({
         id: crypto.randomUUID(),
         classId,
         studentId,
         date,
         status
       });
    }
  }, []);

  return {
    classes,
    students,
    attendances,
    addClass,
    deleteClass,
    addStudent,
    deleteStudent,
    toggleAttendance
  };
};
