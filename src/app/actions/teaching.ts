"use server";
import { revalidatePath } from "next/cache";
import { and, eq, asc, inArray } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcClass, tcStudent, tcSession, tcAttendance, tcAssignment, tcGrade, tcMaterial, tcCourse, tcModule, tcLesson, tcQuestion, tcQuiz, tcQuizQuestion, tcQuizAttempt, tcGradeCategory, tcCertificate, tcCodeProblem, tcTestCase, tcCodeSubmission, tcCodeRun, tcThread, tcPost, classEnrolCode } from "@/db/lms/schema";
import { genId } from "@/lib/id";
import { deleteStudentCascade } from "@/lib/lms/cascade";
import { logAccess } from "@/lib/lms/audit";
import { deleteMaterial as deleteMaterialFile } from "@/lib/lms/storage";
import { decryptFieldOpt, encryptFieldOpt } from "@/lib/lms/crypto";

function refreshClass(id?: string) {
  revalidatePath("/teaching/classes");
  if (id) revalidatePath(`/teaching/classes/${id}`);
}

// ===== Class =====
export async function createClass(input: { name: string; term?: string }) {
  const id = genId();
  await lmsDb.insert(tcClass).values({ id, name: input.name, term: input.term ?? null, status: "active", createdAt: Date.now() });
  refreshClass();
  return { ok: true, id };
}

// Clone: copy assignment + roster học viên, KHÔNG copy điểm/điểm danh/buổi (chống copy-paste khi mở lớp mới).
export async function cloneClass(fromId: string, input: { name: string; term?: string }) {
  const id = genId();
  const now = Date.now();
  await lmsDb.insert(tcClass).values({ id, name: input.name, term: input.term ?? null, status: "active", createdAt: now });
  const students = await lmsDb.select().from(tcStudent).where(eq(tcStudent.classId, fromId));
  for (const s of students) await lmsDb.insert(tcStudent).values({ id: genId(), classId: id, name: s.name, email: s.email, note: s.note, createdAt: now });
  const assignments = await lmsDb.select().from(tcAssignment).where(eq(tcAssignment.classId, fromId));
  for (const a of assignments) await lmsDb.insert(tcAssignment).values({ id: genId(), classId: id, title: a.title, dueAt: null, maxScore: a.maxScore, descriptionMd: a.descriptionMd, createdAt: now });
  refreshClass();
  return { ok: true, id };
}

export async function archiveClass(id: string) {
  await lmsDb.update(tcClass).set({ status: "archived" }).where(eq(tcClass.id, id));
  refreshClass(id);
  return { ok: true };
}

// ===== Students =====
export async function addStudent(input: { classId: string; name: string; email?: string }) {
  await lmsDb.insert(tcStudent).values({ id: genId(), classId: input.classId, name: input.name, email: input.email ?? null, createdAt: Date.now() });
  refreshClass(input.classId);
  return { ok: true };
}
// Xóa HV = CASCADE (S5): xóa SẠCH điểm/điểm danh/bài nộp(+file)/đồng ý/mã truy cập/lms_user/tc_student
// trong 1 transaction — KHÔNG để mồ côi (R-JL-STUDENT-PII-01, AC-13). Audit ghi trong cascade.
export async function removeStudent(id: string, classId: string) {
  await deleteStudentCascade(id, "instructor");
  refreshClass(classId);
  return { ok: true };
}

// ===== Session + attendance =====
export async function createSession(input: { classId: string; dateAt: number; topic?: string }) {
  const id = genId();
  await lmsDb.insert(tcSession).values({ id, classId: input.classId, dateAt: input.dateAt, topic: input.topic ?? null, createdAt: Date.now() });
  refreshClass(input.classId);
  return { ok: true, id };
}
export async function setAttendance(sessionId: string, classId: string, entries: { studentId: string; status: string }[]) {
  const now = Date.now();
  await lmsDb.delete(tcAttendance).where(eq(tcAttendance.sessionId, sessionId));
  for (const e of entries) await lmsDb.insert(tcAttendance).values({ id: genId(), sessionId, studentId: e.studentId, status: e.status, markedAt: now });
  refreshClass(classId);
  return { ok: true };
}

// ===== Assignment + grade =====
export async function createAssignment(input: { classId: string; title: string; dueAt?: number | null; maxScore?: number; descriptionMd?: string | null }) {
  const id = genId();
  await lmsDb.insert(tcAssignment).values({ id, classId: input.classId, title: input.title, dueAt: input.dueAt ?? null, maxScore: input.maxScore ?? 10, descriptionMd: input.descriptionMd ?? null, createdAt: Date.now() });
  refreshClass(input.classId);
  return { ok: true, id };
}
export async function setGrade(input: { assignmentId: string; studentId: string; classId: string; score: number | null; feedback: string | null }) {
  const existing = (await lmsDb.select().from(tcGrade).where(and(eq(tcGrade.assignmentId, input.assignmentId), eq(tcGrade.studentId, input.studentId))).limit(1))[0];
  const now = Date.now();
  if (existing) {
    await lmsDb.update(tcGrade).set({ score: input.score, feedback: input.feedback, gradedAt: now }).where(eq(tcGrade.id, existing.id));
  } else {
    await lmsDb.insert(tcGrade).values({ id: genId(), assignmentId: input.assignmentId, studentId: input.studentId, score: input.score, feedback: input.feedback, gradedAt: now });
  }
  // Audit sửa điểm (append-only, KHÔNG ghi điểm số/nhận xét — chỉ id bài tập). Actor = instructor.
  await logAccess({ actor: "instructor", action: "grade_edit", targetType: "grade", targetId: input.assignmentId });
  refreshClass(input.classId);
  return { ok: true };
}

// ===== Update / Delete helpers =====
export async function updateAssignment(id: string, input: { title?: string; dueAt?: number | null; maxScore?: number; descriptionMd?: string | null }) {
  await lmsDb.update(tcAssignment).set(input).where(eq(tcAssignment.id, id));
  // classId không biết trực tiếp → revalidate rộng
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteSession(id: string, classId: string) {
  await lmsDb.delete(tcAttendance).where(eq(tcAttendance.sessionId, id));
  await lmsDb.delete(tcSession).where(eq(tcSession.id, id));
  refreshClass(classId);
  return { ok: true };
}

export async function deleteAssignment(id: string, classId: string) {
  await lmsDb.delete(tcGrade).where(eq(tcGrade.assignmentId, id));
  await lmsDb.delete(tcAssignment).where(eq(tcAssignment.id, id));
  refreshClass(classId);
  return { ok: true };
}

// ===== Tài liệu lớp (P-LMS-1) — link/video ngay; upload file chờ object storage (P-LMS-0) =====
export async function addMaterialLink(input: { classId: string; title: string; url: string }) {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) return { ok: false, error: "Nhập tiêu đề tài liệu." };
  // CHỈ nhận http/https (chống javascript:/data: → stored-XSS khi mở link).
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "Đường dẫn phải bắt đầu bằng http:// hoặc https://" };
    }
  } catch {
    return { ok: false, error: "Đường dẫn không hợp lệ." };
  }
  await lmsDb.insert(tcMaterial).values({
    id: genId(),
    classId: input.classId,
    title,
    url,
    fileRef: null,
    mime: null,
    size: null,
    visibility: "class",
    createdAt: Date.now(),
  });
  await logAccess({ actor: "instructor", action: "create_material", targetType: "material" });
  refreshClass(input.classId);
  return { ok: true };
}

export async function deleteMaterial(id: string, classId: string) {
  const m = (await lmsDb.select().from(tcMaterial).where(eq(tcMaterial.id, id)).limit(1))[0];
  if (m?.fileRef) await deleteMaterialFile(m.fileRef); // xóa file đĩa nếu có (tài liệu dạng file)
  await lmsDb.delete(tcMaterial).where(eq(tcMaterial.id, id));
  await logAccess({ actor: "instructor", action: "delete_material", targetType: "material", targetId: id });
  refreshClass(classId);
  return { ok: true };
}

/** P-LMS-1: Xuất điểm lớp ra CSV (UTF-8 BOM cho Excel). */
export async function exportGradesCSV(classId: string): Promise<string> {
  const students = await lmsDb.select().from(tcStudent).where(eq(tcStudent.classId, classId)).orderBy(asc(tcStudent.name));
  const assignments = await lmsDb.select().from(tcAssignment).where(eq(tcAssignment.classId, classId)).orderBy(asc(tcAssignment.createdAt));
  const grades = await lmsDb.select().from(tcGrade).where(
    inArray(tcGrade.assignmentId, assignments.map(a => a.id)),
  );

  // Build grade lookup: studentId -> assignmentId -> score
  const gradeLookup = new Map<string, Map<string, number | null>>();
  for (const g of grades) {
    if (!gradeLookup.has(g.studentId)) gradeLookup.set(g.studentId, new Map());
    gradeLookup.get(g.studentId)!.set(g.assignmentId, g.score);
  }

  // CSV header
  const header = ["Họ tên", ...assignments.map(a => a.title), "Trung bình"];
  const rows: string[][] = [header];

  for (const s of students) {
    const name = decryptFieldOpt(s.name) ?? s.name;
    const scores = assignments.map(a => {
      const score = gradeLookup.get(s.id)?.get(a.id);
      return score != null ? String(score) : "";
    });
    const scored = scores.filter(s => s !== "").map(Number);
    const avg = scored.length > 0 ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : "";
    rows.push([name, ...scores, avg]);
  }

  // UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  return bom + rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

/** P-LMS-1: Nhập học viên từ CSV. Mỗi dòng: tên, email (optional), ghi chú (optional). */
export async function importStudentsCSV(classId: string, csvText: string): Promise<{ added: number; errors: string[] }> {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  // Skip header if it looks like one
  const start = lines[0]?.toLowerCase().includes("tên") || lines[0]?.toLowerCase().includes("name") ? 1 : 0;
  let added = 0;
  const errors: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, ""));
    const name = parts[0];
    if (!name) { errors.push(`Dòng ${i + 1}: thiếu tên`); continue; }
    const email = parts[1] || null;
    const note = parts[2] || null;
    const sid = genId();
    await lmsDb.insert(tcStudent).values({
      id: sid,
      classId,
      name: encryptFieldOpt(name) ?? name,
      email: encryptFieldOpt(email),
      note: encryptFieldOpt(note),
      createdAt: Date.now(),
    });
    added++;
  }

  refreshClass(classId);
  return { added, errors };
}

// ===== P-LMS-2: Course Structure (module/lesson) =====

export async function createModule(input: { courseId: string; title: string; descriptionMd?: string | null }) {
  // Determine next position
  const existing = await lmsDb.select({ position: tcModule.position }).from(tcModule)
    .where(eq(tcModule.courseId, input.courseId)).orderBy(asc(tcModule.position));
  const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;
  const id = genId();
  await lmsDb.insert(tcModule).values({
    id, courseId: input.courseId, title: input.title,
    descriptionMd: input.descriptionMd ?? null,
    position: nextPos, createdAt: Date.now(),
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function updateModule(id: string, input: { title?: string; descriptionMd?: string | null; position?: number }) {
  await lmsDb.update(tcModule).set(input).where(eq(tcModule.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteModule(id: string) {
  // Cascade: xóa lessons trong module trước
  await lmsDb.delete(tcLesson).where(eq(tcLesson.moduleId, id));
  await lmsDb.delete(tcModule).where(eq(tcModule.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function createLesson(input: {
  moduleId: string; title: string; kind?: string;
  contentMd?: string | null; videoUrl?: string | null;
}) {
  // Determine next position
  const existing = await lmsDb.select({ position: tcLesson.position }).from(tcLesson)
    .where(eq(tcLesson.moduleId, input.moduleId)).orderBy(asc(tcLesson.position));
  const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;
  const id = genId();
  await lmsDb.insert(tcLesson).values({
    id, moduleId: input.moduleId, title: input.title,
    kind: input.kind ?? "text",
    contentMd: input.contentMd ?? null,
    videoUrl: input.videoUrl ?? null,
    position: nextPos, createdAt: Date.now(),
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function updateLesson(id: string, input: {
  title?: string; kind?: string; contentMd?: string | null;
  videoUrl?: string | null; position?: number;
}) {
  await lmsDb.update(tcLesson).set(input).where(eq(tcLesson.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteLesson(id: string) {
  await lmsDb.delete(tcLesson).where(eq(tcLesson.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

// ===== Course management =====
export async function updateCourse(id: string, input: { title?: string; descriptionMd?: string | null; slug?: string; status?: string }) {
  await lmsDb.update(tcCourse).set(input).where(eq(tcCourse.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

// ===== P-LMS-3: Quiz + Question Bank =====

export async function createQuestion(input: {
  courseId?: string | null; type: string; stemMd: string;
  choicesJson?: string | null; correctJson?: string | null; points?: number;
}) {
  const id = genId();
  // correctJson: mã hóa at-rest nếu có key (QĐ2: KHÔNG gửi client)
  let encCorrect = input.correctJson ?? null;
  if (encCorrect) {
    try { encCorrect = encryptFieldOpt(encCorrect) ?? encCorrect; } catch { /* no key = plaintext */ }
  }
  await lmsDb.insert(tcQuestion).values({
    id, courseId: input.courseId ?? null, type: input.type,
    stemMd: input.stemMd, choicesJson: input.choicesJson ?? null,
    correctJson: encCorrect, points: input.points ?? 1,
    createdAt: Date.now(),
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function updateQuestion(id: string, input: {
  stemMd?: string; choicesJson?: string | null; correctJson?: string | null;
  points?: number; type?: string;
}) {
  const updates: Record<string, unknown> = { ...input };
  if (input.correctJson !== undefined) {
    let enc = input.correctJson;
    if (enc) {
      try { enc = encryptFieldOpt(enc) ?? enc; } catch { /* no key */ }
    }
    updates.correctJson = enc;
  }
  await lmsDb.update(tcQuestion).set(updates).where(eq(tcQuestion.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteQuestion(id: string) {
  // Xóa liên kết trong quiz trước
  await lmsDb.delete(tcQuizQuestion).where(eq(tcQuizQuestion.questionId, id));
  await lmsDb.delete(tcQuestion).where(eq(tcQuestion.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function createQuiz(input: {
  courseId: string; lessonId?: string | null; title: string;
  timeLimitSec?: number | null; maxAttempts?: number;
  shuffle?: boolean; revealAfter?: boolean;
}) {
  const id = genId();
  await lmsDb.insert(tcQuiz).values({
    id, courseId: input.courseId, lessonId: input.lessonId ?? null,
    title: input.title, timeLimitSec: input.timeLimitSec ?? null,
    maxAttempts: input.maxAttempts ?? 1,
    shuffle: input.shuffle ? 1 : 0,
    revealAfter: input.revealAfter ? 1 : 0,
    status: "draft", createdAt: Date.now(),
  });
  await logAccess({ actor: "instructor", action: "create_quiz", targetType: "quiz", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function updateQuiz(id: string, input: {
  title?: string; timeLimitSec?: number | null; maxAttempts?: number;
  shuffle?: boolean; revealAfter?: boolean; status?: string; lessonId?: string | null;
}) {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.timeLimitSec !== undefined) updates.timeLimitSec = input.timeLimitSec;
  if (input.maxAttempts !== undefined) updates.maxAttempts = input.maxAttempts;
  if (input.shuffle !== undefined) updates.shuffle = input.shuffle ? 1 : 0;
  if (input.revealAfter !== undefined) updates.revealAfter = input.revealAfter ? 1 : 0;
  if (input.status !== undefined) updates.status = input.status;
  if (input.lessonId !== undefined) updates.lessonId = input.lessonId;
  await lmsDb.update(tcQuiz).set(updates).where(eq(tcQuiz.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteQuiz(id: string) {
  // Cascade: attempts + quiz_questions + quiz
  await lmsDb.delete(tcQuizAttempt).where(eq(tcQuizAttempt.quizId, id));
  await lmsDb.delete(tcQuizQuestion).where(eq(tcQuizQuestion.quizId, id));
  await lmsDb.delete(tcQuiz).where(eq(tcQuiz.id, id));
  await logAccess({ actor: "instructor", action: "delete_quiz", targetType: "quiz", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Thêm câu hỏi vào quiz. */
export async function addQuestionToQuiz(quizId: string, questionId: string) {
  const existing = await lmsDb.select({ position: tcQuizQuestion.position }).from(tcQuizQuestion)
    .where(eq(tcQuizQuestion.quizId, quizId)).orderBy(asc(tcQuizQuestion.position));
  const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;
  await lmsDb.insert(tcQuizQuestion).values({
    id: genId(), quizId, questionId, position: nextPos,
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Xóa câu hỏi khỏi quiz. */
export async function removeQuestionFromQuiz(quizId: string, questionId: string) {
  await lmsDb.delete(tcQuizQuestion).where(
    and(eq(tcQuizQuestion.quizId, quizId), eq(tcQuizQuestion.questionId, questionId)),
  );
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

// ===== P-LMS-5: Gradebook trọng số + Chứng chỉ =====

export async function createGradeCategory(input: { courseId: string; name: string; weight?: number }) {
  const existing = await lmsDb.select({ position: tcGradeCategory.position }).from(tcGradeCategory)
    .where(eq(tcGradeCategory.courseId, input.courseId)).orderBy(asc(tcGradeCategory.position));
  const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;
  const id = genId();
  await lmsDb.insert(tcGradeCategory).values({
    id, courseId: input.courseId, name: input.name,
    weight: input.weight ?? 1, position: nextPos,
    createdAt: Date.now(),
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function updateGradeCategory(id: string, input: { name?: string; weight?: number; position?: number }) {
  await lmsDb.update(tcGradeCategory).set(input).where(eq(tcGradeCategory.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteGradeCategory(id: string) {
  // Unlink assignments first (set categoryId = null)
  await lmsDb.update(tcAssignment).set({ categoryId: null }).where(eq(tcAssignment.categoryId, id));
  await lmsDb.delete(tcGradeCategory).where(eq(tcGradeCategory.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Cấp chứng chỉ cho học viên. */
export async function issueCertificate(input: { personId: string; courseId: string; criteriaSnapshotJson?: string }) {
  const id = genId();
  // Generate random verify code (16 bytes = 128 bit, hex)
  const crypto = await import("crypto");
  const verifyCode = crypto.randomBytes(16).toString("hex");
  await lmsDb.insert(tcCertificate).values({
    id, personId: input.personId, courseId: input.courseId,
    issuedAt: Date.now(), verifyCode,
    criteriaSnapshotJson: input.criteriaSnapshotJson ?? null,
    revoked: 0,
  });
  await logAccess({ actor: "instructor", action: "issue_certificate", targetType: "certificate", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id, verifyCode };
}

/** Thu hồi chứng chỉ. */
export async function revokeCertificate(id: string) {
  await lmsDb.update(tcCertificate).set({ revoked: 1 }).where(eq(tcCertificate.id, id));
  await logAccess({ actor: "instructor", action: "revoke_certificate", targetType: "certificate", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Tính điểm tổng kết theo trọng số nhóm. */
export async function computeWeightedGrade(studentId: string, courseId: string) {
  // 1. Lấy categories của khóa
  const categories = await lmsDb.select().from(tcGradeCategory)
    .where(eq(tcGradeCategory.courseId, courseId));
  if (categories.length === 0) return { weightedScore: null, details: [] };

  // 2. Lấy tất cả classes của course (student có thể ở nhiều đợt)
  const classes = await lmsDb.select({ id: tcClass.id }).from(tcClass)
    .where(eq(tcClass.courseId, courseId));
  const classIds = classes.map(c => c.id);
  if (classIds.length === 0) return { weightedScore: null, details: [] };

  // 3. Lấy assignments của các class (có categoryId)
  const assignments = await lmsDb.select().from(tcAssignment)
    .where(and(inArray(tcAssignment.classId, classIds)));

  // 4. Lấy grades của student
  const assignmentIds = assignments.map(a => a.id);
  if (assignmentIds.length === 0) return { weightedScore: null, details: [] };
  const grades = await lmsDb.select().from(tcGrade)
    .where(and(eq(tcGrade.studentId, studentId), inArray(tcGrade.assignmentId, assignmentIds)));
  const gradeByAssignment = new Map(grades.map(g => [g.assignmentId, g]));

  // 5. Tính điểm theo nhóm
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  let weightedSum = 0;
  const details = categories.map(cat => {
    const catAssignments = assignments.filter(a => a.categoryId === cat.id);
    let earned = 0, maxPossible = 0;
    for (const a of catAssignments) {
      const g = gradeByAssignment.get(a.id);
      if (g?.score != null) { earned += g.score; maxPossible += a.maxScore; }
      else { maxPossible += a.maxScore; }
    }
    const catPct = maxPossible > 0 ? earned / maxPossible : 0;
    const normalizedWeight = totalWeight > 0 ? cat.weight / totalWeight : 0;
    weightedSum += catPct * normalizedWeight;
    return { categoryId: cat.id, name: cat.name, weight: cat.weight, earned, maxPossible, pct: Math.round(catPct * 100) };
  });

  return { weightedScore: Math.round(weightedSum * 100) / 100, details };
}

// ===== P-LMS-4: Code Auto-grade =====

export async function createCodeProblem(input: {
  courseId: string; lessonId?: string | null; title: string;
  statementMd: string; languagesJson?: string;
  timeLimitMs?: number; memLimitMb?: number; totalWeight?: number;
}) {
  const id = genId();
  await lmsDb.insert(tcCodeProblem).values({
    id, courseId: input.courseId, lessonId: input.lessonId ?? null,
    title: input.title, statementMd: input.statementMd,
    languagesJson: input.languagesJson ?? '["python","javascript"]',
    timeLimitMs: input.timeLimitMs ?? 5000,
    memLimitMb: input.memLimitMb ?? 256,
    totalWeight: input.totalWeight ?? 100,
    status: "draft", createdAt: Date.now(),
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function updateCodeProblem(id: string, input: {
  title?: string; statementMd?: string; languagesJson?: string;
  timeLimitMs?: number; memLimitMb?: number; totalWeight?: number; status?: string;
}) {
  await lmsDb.update(tcCodeProblem).set(input).where(eq(tcCodeProblem.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function deleteCodeProblem(id: string) {
  // Cascade: runs -> submissions -> test cases -> problem
  const subs = await lmsDb.select({ id: tcCodeSubmission.id }).from(tcCodeSubmission)
    .where(eq(tcCodeSubmission.problemId, id));
  for (const s of subs) {
    await lmsDb.delete(tcCodeRun).where(eq(tcCodeRun.submissionId, s.id));
  }
  await lmsDb.delete(tcCodeSubmission).where(eq(tcCodeSubmission.problemId, id));
  await lmsDb.delete(tcTestCase).where(eq(tcTestCase.problemId, id));
  await lmsDb.delete(tcCodeProblem).where(eq(tcCodeProblem.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

export async function createTestCase(input: {
  problemId: string; input?: string | null; expectedOutput: string;
  isHidden?: boolean; weight?: number;
}) {
  const existing = await lmsDb.select({ position: tcTestCase.position }).from(tcTestCase)
    .where(eq(tcTestCase.problemId, input.problemId)).orderBy(asc(tcTestCase.position));
  const nextPos = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;
  // Mã hóa input/expected nếu test ẩn
  let encInput = input.input ?? null;
  let encExpected = input.expectedOutput;
  if (input.isHidden) {
    try {
      encInput = encInput ? (encryptFieldOpt(encInput) ?? encInput) : null;
      encExpected = encryptFieldOpt(encExpected) ?? encExpected;
    } catch { /* no key = plaintext */ }
  }
  const id = genId();
  await lmsDb.insert(tcTestCase).values({
    id, problemId: input.problemId, input: encInput,
    expectedOutput: encExpected, isHidden: input.isHidden ? 1 : 0,
    weight: input.weight ?? 1, position: nextPos,
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

export async function deleteTestCase(id: string) {
  await lmsDb.delete(tcTestCase).where(eq(tcTestCase.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

// ===== P-LMS-6: Forum + Enrollment nâng cao =====

/** Tạo mã tham gia lớp (self-enrol). */
export async function createEnrolCode(input: { courseId: string; maxUses?: number | null; expiresAt?: number | null }) {
  const id = genId();
  // Mã ngắn 6 ký tự (A-Z, 0-9, loại ký tự nhầm lẫn O/0/I/1)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  await lmsDb.insert(classEnrolCode).values({
    id, courseId: input.courseId, code,
    maxUses: input.maxUses ?? null,
    usedCount: 0,
    expiresAt: input.expiresAt ?? null,
    active: 1, createdAt: Date.now(),
  });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id, code };
}

/** Vô hiệu hóa mã tham gia. */
export async function deactivateEnrolCode(id: string) {
  await lmsDb.update(classEnrolCode).set({ active: 0 }).where(eq(classEnrolCode.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Tạo thread (instructor). */
export async function createThread(input: { courseId: string; lessonId?: string | null; title: string }) {
  const id = genId();
  await lmsDb.insert(tcThread).values({
    id, courseId: input.courseId, lessonId: input.lessonId ?? null,
    authorType: "instructor", authorRef: "owner",
    title: input.title, status: "open", createdAt: Date.now(),
  });
  await logAccess({ actor: "instructor", action: "create_thread", targetType: "thread", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

/** Khóa/mở thread. */
export async function toggleThreadLock(id: string, lock: boolean) {
  await lmsDb.update(tcThread).set({ status: lock ? "locked" : "open" }).where(eq(tcThread.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Trả lời thread (instructor). */
export async function replyThread(input: { threadId: string; bodyMd: string; parentId?: string | null }) {
  const id = genId();
  await lmsDb.insert(tcPost).values({
    id, threadId: input.threadId,
    authorType: "instructor", authorRef: "owner",
    bodyMd: input.bodyMd, parentId: input.parentId ?? null,
    hidden: 0, createdAt: Date.now(),
  });
  await logAccess({ actor: "instructor", action: "create_post", targetType: "post", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true, id };
}

/** Ẩn bài viết (kiểm duyệt: ẩn thay vì xóa cứng). */
export async function hidePost(id: string) {
  await lmsDb.update(tcPost).set({ hidden: 1 }).where(eq(tcPost.id, id));
  await logAccess({ actor: "instructor", action: "hide_post", targetType: "post", targetId: id });
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}

/** Unhide bài viết. */
export async function unhidePost(id: string) {
  await lmsDb.update(tcPost).set({ hidden: 0 }).where(eq(tcPost.id, id));
  revalidatePath("/teaching/classes", "layout");
  return { ok: true };
}
