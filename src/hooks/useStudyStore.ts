import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { StudyCourse, StudyAssignment, StudyDoc, Priority } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useStudyStore() {
  const courses = useLiveQuery(() => db.studyCourses.reverse().toArray()) || [];
  const assignments = useLiveQuery(() => db.studyAssignments.reverse().toArray()) || [];
  const docs = useLiveQuery(() => db.studyDocs.reverse().toArray()) || [];

  const addCourse = async (name: string, courseCode: string, scheduleRules: number[], startDate: string, endDate: string, lmsUrl?: string, description?: string) => {
    const id = uuidv4();
    const newCourse: StudyCourse = {
      id, name, courseCode, scheduleRules, startDate, endDate, lmsUrl, description,
      createdAt: Date.now()
    };
    await db.studyCourses.add(newCourse);
    return id;
  };

  const deleteCourse = async (id: string) => {
    await db.studyCourses.delete(id);
    // Cleanup related items
    await db.studyAssignments.where('courseId').equals(id).delete();
    await db.studyDocs.where('courseId').equals(id).delete();
  };

  const addAssignment = async (courseId: string, title: string, dueDate: string, priority: Priority = 'MEDIUM', weight?: number, description?: string) => {
    const id = uuidv4();
    const newAsg: StudyAssignment = {
      id, courseId, title, dueDate, priority, weight, description,
      status: 'TODO',
      createdAt: Date.now()
    };
    await db.studyAssignments.add(newAsg);

    // Sync to main tasks
    const course = await db.studyCourses.get(courseId);
    await db.tasks.add({
      id: uuidv4(),
      title: `[${course?.courseCode || 'MASTER'}] ${title}`,
      role: 'MASTER',
      priority,
      deadline: dueDate,
      notes: description || `Bài tập môn ${course?.name || ''}`,
      createdAt: Date.now(),
      completed: false
    });

    return id;
  };

  const updateAssignment = async (id: string, updates: Partial<StudyAssignment>) => {
    await db.studyAssignments.update(id, updates);
  };

  const deleteAssignment = async (id: string) => {
    await db.studyAssignments.delete(id);
  };

  const addDoc = async (courseId: string, title: string, url: string, type: StudyDoc['type'], description?: string) => {
    const id = uuidv4();
    const newDoc: StudyDoc = {
      id, courseId, title, url, type, description,
      createdAt: Date.now()
    };
    await db.studyDocs.add(newDoc);
    return id;
  };

  const deleteDoc = async (id: string) => {
    await db.studyDocs.delete(id);
  };

  return {
    courses, assignments, docs,
    addCourse, deleteCourse,
    addAssignment, updateAssignment, deleteAssignment,
    addDoc, deleteDoc
  };
}
