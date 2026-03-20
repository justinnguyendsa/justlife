import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Class, Student, Task, Submission, TeachingDoc, Assignment } from '../types';

export const useTeachingStore = () => {
  const classes = useLiveQuery(() => db.classes.toArray()) as Class[] | undefined ?? [];
  const students = useLiveQuery(() => db.students.toArray()) as Student[] | undefined ?? [];
  const attendances = useLiveQuery(() => db.attendances.toArray()) ?? [];
  const assignments = useLiveQuery(() => db.assignments.toArray()) ?? [];
  const submissions = useLiveQuery(() => db.submissions.toArray()) as Submission[] | undefined ?? [];
  const teachingDocs = useLiveQuery(() => db.teachingDocs.toArray()) as TeachingDoc[] | undefined ?? [];

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

        // Task Sync Engine (generate tasks auto)
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

  const updateClass = useCallback(async (id: string, partial: Partial<Class>) => {
    await db.classes.update(id, partial);
  }, []);

  const deleteClass = useCallback(async (id: string) => {
    // Note: Do not delete Students and Docs! Instead, remove `classId` from their `classIds` array!
    await db.transaction('rw', [db.classes, db.students, db.attendances, db.assignments, db.teachingDocs], async () => {
      await db.classes.delete(id);

      // Remove this class from student assignments
      const studentsInClass = await db.students.where('classIds').equals(id).toArray();
      for (const s of studentsInClass) {
        s.classIds = s.classIds.filter(cid => cid !== id);
        await db.students.put(s);
      }

      // Remove this class from docs
      const docsInClass = await db.teachingDocs.where('classIds').equals(id).toArray();
      for (const d of docsInClass) {
        d.classIds = d.classIds.filter(cid => cid !== id);
        await db.teachingDocs.put(d);
      }

      // Actually Delete attendances and assignments
      const attsToDelete = await db.attendances.where({ classId: id }).primaryKeys();
      if (attsToDelete.length > 0) await db.attendances.bulkDelete(attsToDelete);

      const assignsToDelete = await db.assignments.where({ classId: id }).primaryKeys();
      if (assignsToDelete.length > 0) {
        await db.assignments.bulkDelete(assignsToDelete);
      }
    });
  }, []);

  // --------------- STUDENTS POOL ----------------
  const addStudent = useCallback(async (name: string, studentCode: string, email?: string, initialClassId?: string) => {
    const s: Student = {
      id: crypto.randomUUID(),
      classIds: initialClassId ? [initialClassId] : [],
      name,
      studentCode,
      email,
      status: 'ACTIVE',
      joinedAt: Date.now()
    };
    await db.students.add(s);
  }, []);

  const bulkAddStudents = useCallback(async (items: Array<{ name: string, studentCode: string, email?: string }>, classId?: string) => {
    const newStudents: Student[] = items.map(item => ({
      id: crypto.randomUUID(),
      classIds: classId ? [classId] : [],
      name: item.name,
      studentCode: item.studentCode,
      email: item.email,
      status: 'ACTIVE',
      joinedAt: Date.now()
    }));
    await db.students.bulkAdd(newStudents);
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    await db.students.delete(id);
  }, []);

  const updateStudent = useCallback(async (id: string, partial: Partial<Student>) => {
    await db.students.update(id, partial);
  }, []);

  const assignStudentToClass = useCallback(async (studentId: string, classId: string) => {
    const s = await db.students.get(studentId);
    if (s && !s.classIds.includes(classId)) {
      s.classIds.push(classId);
      await db.students.put(s);
    }
  }, []);

  const removeStudentFromClass = useCallback(async (studentId: string, classId: string) => {
    const s = await db.students.get(studentId);
    if (s && s.classIds.includes(classId)) {
      s.classIds = s.classIds.filter(id => id !== classId);
      await db.students.put(s);
    }
  }, []);

  // --------------- ATTENDANCES ----------------
  const toggleAttendance = useCallback(async (classId: string, studentId: string, date: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
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

  // ─── ASSIGNMENTS & SUBMISSIONS ──────────────────────────────────────────────
  const addAssignment = useCallback(async (classId: string, title: string, dueDate: string, points?: number, description?: string) => {
    const assignmentId = crypto.randomUUID();

    await db.transaction('rw', db.assignments, db.submissions, db.students, db.tasks, async () => {
      await db.assignments.add({
        id: assignmentId,
        classId,
        title,
        description,
        dueDate,
        points,
        createdAt: Date.now()
      });

      // Auto-create blank submissions for all students in the class
      const classStudents = await db.students.where('classIds').equals(classId).toArray();
      if (classStudents.length > 0) {
        const newSubmissions: Submission[] = classStudents.map((s: Student) => ({
          id: crypto.randomUUID(),
          assignmentId,
          studentId: s.id,
          isMarked: false
        }));
        await db.submissions.bulkAdd(newSubmissions);
      }

      // Sync Engine: Create Task for Marking (Deadline = dueDate + 3 days)
      const markDue = new Date(dueDate);
      markDue.setDate(markDue.getDate() + 3);

      await db.tasks.add({
        id: crypto.randomUUID(),
        title: `📝 Chấm bài: ${title}`,
        role: 'TEACH',
        priority: 'MEDIUM',
        deadline: markDue.toISOString().split('T')[0],
        notes: `Cần chấm ${classStudents.length} bài. Tự động sinh từ tính năng Giao bài tập.`,
        createdAt: Date.now(),
        completed: false
      });
    });
  }, []);

  const deleteAssignment = useCallback(async (id: string) => {
    await db.transaction('rw', [db.assignments, db.submissions], async () => {
      await db.assignments.delete(id);
      const subs = await db.submissions.where({ assignmentId: id }).primaryKeys();
      if (subs.length > 0) await db.submissions.bulkDelete(subs);
    });
  }, []);

  const updateAssignment = useCallback(async (id: string, partial: Partial<Assignment>) => {
    await db.assignments.update(id, partial);
  }, []);

  const updateSubmission = useCallback(async (id: string, partial: Partial<Submission>) => {
    await db.submissions.update(id, partial);
  }, []);

  const submitWork = useCallback(async (assignmentId: string, studentCode: string, attachmentUrl: string) => {
    await db.transaction('rw', [db.submissions, db.students], async () => {
      // Find student by code
      const student = await db.students.where({ studentCode }).first();
      if (!student) throw new Error('Không tìm thấy học viên với mã số này.');

      // Find submission for this assignment and student
      const submission = await db.submissions.where({ assignmentId, studentId: student.id }).first();
      if (!submission) throw new Error('Học viên không thuộc danh sách được giao bài tập này.');

      // Archive current submission to history if it exists
      const newHistory = [...(submission.history || [])];
      if (submission.attachmentUrl && submission.submittedAt) {
        newHistory.push({
          attachmentUrl: submission.attachmentUrl,
          submittedAt: submission.submittedAt
        });
      }

      // Update submission with new data and archived history
      await db.submissions.update(submission.id, {
        attachmentUrl,
        submittedAt: Date.now(),
        isMarked: false,
        history: newHistory
      });
    });
  }, []);

  // --------------- DOCUMENTS POOL ----------------
  const addDocument = useCallback(async (title: string, url: string, description?: string, initialClassId?: string) => {
    await db.teachingDocs.add({
      id: crypto.randomUUID(),
      classIds: initialClassId ? [initialClassId] : [],
      title,
      url,
      description,
      createdAt: Date.now()
    });
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await db.teachingDocs.delete(id);
  }, []);

  const updateDocument = useCallback(async (id: string, partial: Partial<TeachingDoc>) => {
    await db.teachingDocs.update(id, partial);
  }, []);

  const assignDocToClass = useCallback(async (docId: string, classId: string) => {
    const doc = await db.teachingDocs.get(docId);
    if (doc && !doc.classIds.includes(classId)) {
      doc.classIds.push(classId);
      await db.teachingDocs.put(doc);
    }
  }, []);

  const removeDocFromClass = useCallback(async (docId: string, classId: string) => {
    const doc = await db.teachingDocs.get(docId);
    if (doc && doc.classIds.includes(classId)) {
      doc.classIds = doc.classIds.filter(id => id !== classId);
      await db.teachingDocs.put(doc);
    }
  }, []);

  return {
    classes,
    students,
    attendances,
    assignments,
    submissions,
    teachingDocs,
    addClass,
    updateClass,
    deleteClass,
    addStudent,
    updateStudent,
    bulkAddStudents,
    deleteStudent,
    assignStudentToClass,
    removeStudentFromClass,
    toggleAttendance,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    updateSubmission,
    submitWork,
    addDocument,
    updateDocument,
    deleteDocument,
    assignDocToClass,
    removeDocFromClass
  };
};
