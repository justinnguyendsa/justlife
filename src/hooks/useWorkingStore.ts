import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { WorkingProject, WorkingIssue, IssueType, Priority, Task, WorkingDoc } from '../types';

export function useWorkingStore() {
  const projects = useLiveQuery(() => db.workingProjects.toArray()) || [];
  const issues = useLiveQuery(() => db.workingIssues.toArray()) || [];
  const workingDocs = useLiveQuery(() => db.workingDocs.toArray()) || [];

  const addProject = async (name: string, key: string, description?: string) => {
    const id = uuidv4();
    const newProject: WorkingProject = {
      id,
      name,
      key: key.toUpperCase(),
      description,
      lead: 'User', // Placeholder
      createdAt: Date.now()
    };
    await db.workingProjects.add(newProject);
    return id;
  };

  const deleteProject = async (id: string) => {
    await db.transaction('rw', [db.workingProjects, db.workingIssues, db.workingDocs, db.tasks], async () => {
      await db.workingProjects.delete(id);
      
      // Delete associated issues and their tasks
      const assocIssues = await db.workingIssues.where('projectId').equals(id).toArray();
      for (const issue of assocIssues) {
        await db.workingIssues.delete(issue.id);
        await db.tasks.delete(`WORK_${issue.id}`);
      }

      // Delete associated documents
      const assocDocs = await db.workingDocs.where('projectId').equals(id).primaryKeys();
      if (assocDocs.length > 0) {
        await db.workingDocs.bulkDelete(assocDocs);
      }
    });
  };

  const syncToGlobalTasks = async (issue: WorkingIssue) => {
    const taskId = `WORK_${issue.id}`;
    const task: Task = {
      id: taskId,
      title: `[${issue.key}] ${issue.title}`,
      role: 'WORK',
      priority: issue.priority,
      deadline: issue.dueDate || new Date(issue.createdAt + 7 * 86400000).toISOString().split('T')[0],
      notes: issue.description || '',
      createdAt: issue.createdAt,
      completed: issue.status === 'DONE'
    };
    await db.tasks.put(task);
  };

  const addIssue = async (projectId: string, title: string, type: IssueType, priority: Priority, description?: string, dueDate?: string) => {
    const project = await db.workingProjects.get(projectId);
    if (!project) return;

    // Generate Issue Key (e.g. PROJ-1)
    const projectIssues = await db.workingIssues.where('projectId').equals(projectId).toArray();
    const nextNum = projectIssues.length + 1;
    const key = `${project.key}-${nextNum}`;

    const id = uuidv4();
    const now = Date.now();
    const newIssue: WorkingIssue = {
      id,
      projectId,
      key,
      title,
      type,
      priority,
      description,
      status: 'BACKLOG',
      createdAt: now,
      updatedAt: now,
      dueDate
    };

    await db.workingIssues.add(newIssue);
    await syncToGlobalTasks(newIssue);
    return id;
  };

  const updateIssue = async (id: string, updates: Partial<WorkingIssue>) => {
    await db.workingIssues.update(id, { ...updates, updatedAt: Date.now() });
    const updated = await db.workingIssues.get(id);
    if (updated) {
      await syncToGlobalTasks(updated);
    }
  };

  const deleteIssue = async (id: string) => {
    await db.workingIssues.delete(id);
    await db.tasks.delete(`WORK_${id}`);
  };

  // --------------- DOCUMENTS POOL ----------------
  const addWorkingDoc = async (projectId: string, title: string, url: string, description?: string) => {
    const id = uuidv4();
    const newDoc: WorkingDoc = {
      id,
      projectId,
      title,
      url,
      description,
      createdAt: Date.now()
    };
    await db.workingDocs.add(newDoc);
    return id;
  };

  const updateWorkingDoc = async (id: string, partial: Partial<WorkingDoc>) => {
    await db.workingDocs.update(id, partial);
  };

  const deleteWorkingDoc = async (id: string) => {
    await db.workingDocs.delete(id);
  };

  return {
    projects,
    issues,
    workingDocs,
    addProject,
    deleteProject,
    addIssue,
    updateIssue,
    deleteIssue,
    addWorkingDoc,
    updateWorkingDoc,
    deleteWorkingDoc
  };
}
