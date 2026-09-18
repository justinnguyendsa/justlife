import { and, asc, desc, eq, inArray, gte } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import {
  enrollment,
  lmsPerson,
  lmsUser,
  tcAssignment,
  tcAttendance,
  tcClass,
  tcCourse,
  tcGrade,
  tcLesson,
  tcMaterial,
  tcMaterialProgress,
  tcModule,
  tcProgress,
  tcQuiz,
  tcQuizAttempt,
  tcQuizQuestion,
  tcSession,
  tcStudent,
  tcSubmission,
  tcGradeCategory,
  tcCertificate,
  tcCodeProblem,
  tcCodeSubmission,
  tcThread,
  tcPost,
  classEnrolCode,
} from "@/db/lms/schema";
import { decryptFieldOpt } from "@/lib/lms/crypto";
import { auth } from "@/auth";

// ⭐ Data-access wrapper SCOPED cho cổng học viên (ADR-002 Q4, SPEC-P5a §4, blocker #1).
// BẤT BIẾN:
//  1. MỌI hàm nhận `studentId` SERVER-DERIVED (từ session) — KHÔNG nhận id từ client/query/body.
//  2. MỌI SELECT trả dữ liệu cá nhân có WHERE studentId / membership ở TẦNG DB.
//  3. Truy cập theo id object → kèm membership/ownership check (chống IDOR object-level).
//  4. UI/route CHỈ gọi wrapper này — KHÔNG tự viết Drizzle query với id từ request.
//  5. KHÔNG trả dữ liệu HV khác / lớp khác / Personal OS.
// KHÔNG import @/db/client (Personal) — chỉ chạm lmsDb.
//
// 🗣️ Bình dân: một cửa duy nhất lấy dữ liệu, luôn hỏi "bạn là ai" và chỉ đưa đồ của chính bạn.
//    Sửa id trên URL cũng vô ích.
//
// Note: field định danh (name/feedback…) hiện PLAINTEXT ở local (S1) → decryptFieldOpt
// chỉ giải mã nếu là ciphertext "v1:"; nếu plaintext thì trả nguyên (an toàn cả 2 chiều).

/** Đọc studentId từ session Auth.js. Null nếu chưa đăng nhập. NGUỒN DUY NHẤT của studentId. */
export async function getSessionStudentId(): Promise<string | null> {
  const session = await auth();
  return session?.studentId ?? null;
}

/** Giải mã an toàn: ciphertext v1 → plaintext; nếu đã là plaintext (local S1) → trả nguyên. */
function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      return decryptFieldOpt(value);
    } catch {
      return null; // dữ liệu hỏng → không lộ rác
    }
  }
  return value;
}

/** Lấy danh sách classId mà HV thuộc về (HV có thể có nhiều bản ghi/nhiều lớp). */
async function myClassIds(studentId: string): Promise<string[]> {
  const rows = await lmsDb
    .select({ classId: tcStudent.classId })
    .from(tcStudent)
    .where(eq(tcStudent.id, studentId));
  return [...new Set(rows.map((r) => r.classId))];
}

/** S0: Lấy enrollments của người học. Fallback về myClassIds nếu chưa có enrollment. */
export async function myEnrollments(studentId: string): Promise<{ classId: string; courseId: string | null; personId: string | null }[]> {
  // Try enrollment-based lookup first (S0+)
  // Find personId from tc_student
  const student = await lmsDb
    .select({ personId: tcStudent.personId })
    .from(tcStudent)
    .where(eq(tcStudent.id, studentId))
    .limit(1);

  const personId = student[0]?.personId;

  if (personId) {
    // S0+: query enrollment by personId
    const enrollments = await lmsDb
      .select({
        classId: enrollment.classId,
        courseId: enrollment.courseId,
        personId: enrollment.personId,
      })
      .from(enrollment)
      .where(and(
        eq(enrollment.personId, personId),
        eq(enrollment.status, "active"),
      ));
    if (enrollments.length > 0) return enrollments;
  }

  // Fallback: legacy pattern (tc_student.classId)
  const ids = await myClassIds(studentId);
  return ids.map(classId => ({ classId, courseId: null, personId: null }));
}

/** S0: Lấy personId từ studentId. Null nếu chưa migrate S0. */
export async function getMyPersonId(studentId: string): Promise<string | null> {
  const row = await lmsDb
    .select({ personId: tcStudent.personId })
    .from(tcStudent)
    .where(eq(tcStudent.id, studentId))
    .limit(1);
  return row[0]?.personId ?? null;
}

/**
 * Ném lỗi nếu studentId KHÔNG thuộc classId. Dùng TRƯỚC mọi truy cập theo classId.
 */
export async function assertMembership(studentId: string, classId: string): Promise<void> {
  const ids = await myClassIds(studentId);
  if (!ids.includes(classId)) {
    throw new Error("FORBIDDEN: không thuộc lớp này.");
  }
}

/** Lớp của tôi (chỉ lớp HV thuộc về). S0: thêm courseId. */
export async function getMyClasses(studentId: string) {
  const enrs = await myEnrollments(studentId);
  const ids = enrs.map(e => e.classId);
  if (ids.length === 0) return [];
  const classes = await lmsDb
    .select({
      id: tcClass.id,
      name: tcClass.name,
      term: tcClass.term,
      courseId: tcClass.courseId,
      status: tcClass.status,
    })
    .from(tcClass)
    .where(inArray(tcClass.id, ids));
  return classes;
}

/** Điểm của TÔI (chỉ điểm của studentId). join assignment để có tiêu đề/điểm tối đa. */
export async function getMyGrades(studentId: string) {
  const rows = await lmsDb
    .select({
      gradeId: tcGrade.id,
      assignmentId: tcAssignment.id,
      assignmentTitle: tcAssignment.title,
      maxScore: tcAssignment.maxScore,
      classId: tcAssignment.classId,
      score: tcGrade.score, // SỐ — không mã hóa
      feedback: tcGrade.feedback, // 🔒 có thể là ciphertext
      gradedAt: tcGrade.gradedAt,
    })
    .from(tcGrade)
    .innerJoin(tcAssignment, eq(tcGrade.assignmentId, tcAssignment.id))
    .where(eq(tcGrade.studentId, studentId)); // ⬅ scope ở TẦNG DB
  return rows.map((r) => ({ ...r, feedback: safeDecrypt(r.feedback) }));
}

/** Bài tập của các lớp TÔI thuộc về. */
export async function getMyAssignments(studentId: string) {
  const ids = await myClassIds(studentId);
  if (ids.length === 0) return [];
  return lmsDb
    .select()
    .from(tcAssignment)
    .where(inArray(tcAssignment.classId, ids)); // ⬅ scope theo lớp của HV
}

/** Điểm danh của TÔI (chỉ bản ghi của studentId). join session để có ngày/chủ đề. */
export async function getMyAttendance(studentId: string) {
  return lmsDb
    .select({
      attendanceId: tcAttendance.id,
      sessionId: tcSession.id,
      classId: tcSession.classId,
      dateAt: tcSession.dateAt,
      topic: tcSession.topic,
      status: tcAttendance.status,
      markedAt: tcAttendance.markedAt,
    })
    .from(tcAttendance)
    .innerJoin(tcSession, eq(tcAttendance.sessionId, tcSession.id))
    .where(eq(tcAttendance.studentId, studentId)); // ⬅ scope ở TẦNG DB
}

/**
 * Tài liệu các lớp TÔI thuộc về (visibility='class'). KHÔNG trả tài liệu draft / lớp khác.
 * (tc_material trong lms.db — ĐỌC scoped; route tải file ở S4 sẽ tự check membership lần nữa.)
 */
export async function getMyMaterials(studentId: string) {
  const ids = await myClassIds(studentId);
  if (ids.length === 0) return [];
  return lmsDb
    .select({
      id: tcMaterial.id,
      classId: tcMaterial.classId,
      title: tcMaterial.title,
      fileRef: tcMaterial.fileRef,
      url: tcMaterial.url,
      mime: tcMaterial.mime,
      size: tcMaterial.size,
      createdAt: tcMaterial.createdAt,
    })
    .from(tcMaterial)
    .where(
      and(
        inArray(tcMaterial.classId, ids), // ⬅ chỉ lớp của HV
        eq(tcMaterial.visibility, "class"), // ⬅ không lộ draft
      ),
    );
}

/**
 * Ném lỗi nếu studentId KHÔNG được phép tải material (theo fileRef): material phải thuộc lớp HV
 * là thành viên + visibility='class'. Trả metadata material (đã xác nhận quyền) cho route tải file.
 * Không tiết lộ "ref tồn tại hay không" — cùng một lỗi cho not-found và not-member (chống IDOR).
 */
export async function assertCanAccessMaterial(studentId: string, fileRef: string) {
  const ids = await myClassIds(studentId);
  const rows = await lmsDb
    .select()
    .from(tcMaterial)
    .where(eq(tcMaterial.fileRef, fileRef))
    .limit(1);
  const m = rows[0];
  if (!m || !ids.includes(m.classId) || m.visibility !== "class") {
    throw new Error("FORBIDDEN: không có quyền với tài liệu này.");
  }
  return m;
}

// ===== Bài nộp (Stage 4) — luôn scope theo studentId; chống IDOR object-level =====

/** Bài nộp của TÔI cho 1 bài tập (mới nhất nếu nhiều). null nếu chưa nộp. */
export async function getMySubmission(studentId: string, assignmentId: string) {
  const rows = await lmsDb
    .select()
    .from(tcSubmission)
    .where(
      and(
        eq(tcSubmission.studentId, studentId), // ⬅ scope ở TẦNG DB (chống IDOR)
        eq(tcSubmission.assignmentId, assignmentId),
      ),
    );
  if (rows.length === 0) return null;
  // Mới nhất trước; giải mã tên gốc🔒 để hiển thị.
  const latest = [...rows].sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))[0];
  return { ...latest, originalName: safeDecrypt(latest.originalName) };
}

/**
 * Bài tập của các lớp TÔI thuộc về, KÈM trạng thái bài nộp của TÔI (nếu có).
 * Ghép getMyAssignments + bài nộp của studentId — đều scoped theo studentId.
 */
export async function getMyAssignmentsWithSubmission(studentId: string) {
  const assignments = await getMyAssignments(studentId);
  if (assignments.length === 0) return [];

  // Lấy TẤT CẢ bài nộp của TÔI (1 lần) rồi map theo assignmentId — chỉ bài nộp của studentId.
  const mySubs = await lmsDb
    .select()
    .from(tcSubmission)
    .where(eq(tcSubmission.studentId, studentId)); // ⬅ scope ở TẦNG DB

  // Bài nộp mới nhất cho mỗi assignment.
  const latestByAssignment = new Map<string, (typeof mySubs)[number]>();
  for (const s of mySubs) {
    const cur = latestByAssignment.get(s.assignmentId);
    if (!cur || (s.submittedAt ?? 0) > (cur.submittedAt ?? 0)) {
      latestByAssignment.set(s.assignmentId, s);
    }
  }

  return assignments.map((a) => {
    const sub = latestByAssignment.get(a.id) ?? null;
    return {
      assignment: a,
      submission: sub
        ? {
            id: sub.id,
            fileRef: sub.fileRef,
            originalName: safeDecrypt(sub.originalName),
            mime: sub.mime,
            size: sub.size,
            submittedAt: sub.submittedAt,
            status: sub.status,
          }
        : null,
    };
  });
}

/**
 * Ném lỗi nếu studentId KHÔNG phải chủ của bài nộp (ref). Dùng TRƯỚC khi trả file (chống IDOR).
 * Trả về metadata bài nộp (đã xác nhận quyền sở hữu) — gồm tên gốc đã giải mã.
 */
export async function assertOwnsSubmission(studentId: string, fileRef: string) {
  const rows = await lmsDb
    .select()
    .from(tcSubmission)
    .where(eq(tcSubmission.fileRef, fileRef))
    .limit(1);
  const sub = rows[0];
  // Không tiết lộ "ref tồn tại hay không" — cùng một lỗi cho not-found và not-owner.
  if (!sub || sub.studentId !== studentId) {
    throw new Error("FORBIDDEN: không có quyền với bài nộp này.");
  }
  return { ...sub, originalName: safeDecrypt(sub.originalName) };
}

// ===== ST-1: Tiến độ nộp bài theo lớp =====

/** Tiến độ nộp bài của TÔI theo từng lớp (số bài đã nộp / tổng, %). */
export async function getMyClassProgress(studentId: string) {
  const classIds = await myClassIds(studentId);
  if (classIds.length === 0) return [];

  return Promise.all(
    classIds.map(async (classId) => {
      const [cls] = await lmsDb
        .select({ id: tcClass.id, name: tcClass.name, term: tcClass.term })
        .from(tcClass)
        .where(eq(tcClass.id, classId))
        .limit(1);

      const assignments = await lmsDb
        .select({ id: tcAssignment.id })
        .from(tcAssignment)
        .where(eq(tcAssignment.classId, classId));

      const totalCount = assignments.length;
      if (totalCount === 0) {
        return {
          classId,
          className: cls?.name ?? "",
          term: cls?.term ?? null,
          submitted: 0,
          total: 0,
          pct: 0,
        };
      }

      const assignmentIds = assignments.map((a) => a.id);
      const subs = await lmsDb
        .select({ assignmentId: tcSubmission.assignmentId })
        .from(tcSubmission)
        .where(
          and(
            eq(tcSubmission.studentId, studentId),
            inArray(tcSubmission.assignmentId, assignmentIds),
          ),
        );

      const uniqueSubmitted = new Set(subs.map((s) => s.assignmentId)).size;
      return {
        classId,
        className: cls?.name ?? "",
        term: cls?.term ?? null,
        submitted: uniqueSubmitted,
        total: totalCount,
        pct: Math.round((uniqueSubmitted / totalCount) * 100),
      };
    }),
  );
}

// ===== ST-2: Activity dates (streak calendar) =====

/** Ngày có hoạt động (nộp bài) trong N ngày gần nhất. Dùng cho streak calendar. */
export async function getMyActivityDates(
  studentId: string,
  sinceDays = 28,
): Promise<string[]> {
  const since = Date.now() - sinceDays * 86_400_000;
  const subs = await lmsDb
    .select({ submittedAt: tcSubmission.submittedAt })
    .from(tcSubmission)
    .where(
      and(
        eq(tcSubmission.studentId, studentId),
        gte(tcSubmission.submittedAt, since),
      ),
    );

  // dateKey YYYY-MM-DD (Asia/Ho_Chi_Minh)
  const keys = new Set<string>();
  for (const s of subs) {
    if (!s.submittedAt) continue;
    const d = new Date(s.submittedAt);
    const key = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    keys.add(key);
  }
  return [...keys];
}

// ===== ST-3: Stats 28 ngày =====

/** Thống kê 28 ngày qua của học viên. */
export async function getMyStats28d(studentId: string) {
  const since = Date.now() - 28 * 86_400_000;

  // Bài đã nộp trong 28 ngày
  const subs = await lmsDb
    .select({ id: tcSubmission.id })
    .from(tcSubmission)
    .where(
      and(
        eq(tcSubmission.studentId, studentId),
        gte(tcSubmission.submittedAt, since),
      ),
    );

  // Điểm trung bình (tất cả, đã chấm)
  const grades = await lmsDb
    .select({ score: tcGrade.score })
    .from(tcGrade)
    .where(eq(tcGrade.studentId, studentId));

  const scored = grades.filter((g) => g.score != null);
  const avgScore =
    scored.length > 0
      ? Math.round(
          (scored.reduce((s, g) => s + (g.score ?? 0), 0) / scored.length) *
            10,
        ) / 10
      : null;

  // Buổi có mặt trong 28 ngày (join session để lọc theo dateAt)
  const att = await lmsDb
    .select({ id: tcAttendance.id })
    .from(tcAttendance)
    .innerJoin(tcSession, eq(tcAttendance.sessionId, tcSession.id))
    .where(
      and(
        eq(tcAttendance.studentId, studentId),
        inArray(tcAttendance.status, ["present", "late"]),
        gte(tcSession.dateAt, since),
      ),
    );

  return { submittedCount: subs.length, avgScore, attendedCount: att.length };
}

// ===== ST-4: Learning summary =====

/** Tóm tắt học tập: tỉ lệ có mặt, điểm TB, bài đã nộp. */
export async function getMyLearningSummary(studentId: string) {
  const [assignmentsWithSub, grades, attendance] = await Promise.all([
    getMyAssignmentsWithSubmission(studentId),
    getMyGrades(studentId),
    getMyAttendance(studentId),
  ]);

  const totalAssignments = assignmentsWithSub.length;
  const submitted = assignmentsWithSub.filter((a) => a.submission !== null).length;

  const scored = grades.filter((g) => g.score != null);
  const avgScore =
    scored.length > 0
      ? Math.round(
          (scored.reduce((s, g) => s + (g.score ?? 0), 0) / scored.length) *
            10,
        ) / 10
      : null;

  const presentCount = attendance.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const totalSessions = attendance.length;
  const attendanceRate =
    totalSessions > 0
      ? Math.round((presentCount / totalSessions) * 100)
      : null;

  return {
    totalAssignments,
    submitted,
    avgScore,
    presentCount,
    totalSessions,
    attendanceRate,
  };
}

// ===== Profile (Feature P6 - trang hồ sơ học viên) =====

/**
 * Hồ sơ đầy đủ: thông tin cá nhân + Gmail đã liên kết hay chưa.
 * Trả null nếu không tìm thấy studentId trong DB.
 */
export async function getMyProfile(studentId: string) {
  // Thông tin học viên (giải mã an toàn)
  const stuRows = await lmsDb
    .select({ id: tcStudent.id, name: tcStudent.name, classId: tcStudent.classId })
    .from(tcStudent)
    .where(eq(tcStudent.id, studentId))
    .limit(1);
  const stu = stuRows[0] ?? null;
  if (!stu) return null;

  // Lớp học
  const classes = await getMyClasses(studentId);

  // Gmail đã liên kết?
  const lmsRows = await lmsDb
    .select({ email: lmsUser.email, emailIndex: lmsUser.emailIndex })
    .from(lmsUser)
    .where(eq(lmsUser.studentId, studentId))
    .limit(1);
  const lmsU = lmsRows[0] ?? null;
  const gmailLinked = Boolean(lmsU?.emailIndex);
  const gmailEmail = lmsU?.email ? safeDecrypt(lmsU.email) : null;

  return {
    name: safeDecrypt(stu.name) ?? stu.name,
    studentId,
    classes,
    gmailLinked,
    gmailEmail,
  };
}

/**
 * Lưu Gmail liên kết (mã hóa + blind-index).
 * Bất biến bảo mật: kiểm tra trùng bằng emailIndex, không giải mã toàn bộ.
 */
export async function linkGoogleEmail(
  studentId: string,
  gmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = gmail.trim().toLowerCase();
  if (!normalized.includes("@")) return { ok: false, error: "Email không hợp lệ." };

  try {
    // Import crypto (Node runtime only — portal-queries chạy server-side)
    const { encryptFieldOpt, blindIndex } = await import("@/lib/lms/crypto");
    const emailCipher = encryptFieldOpt(normalized);
    const emailIdx = blindIndex(normalized);

    // Kiểm tra email đã liên kết với tài khoản khác chưa (chống trùng)
    const existing = await lmsDb
      .select({ id: lmsUser.id, studentId: lmsUser.studentId })
      .from(lmsUser)
      .where(eq(lmsUser.emailIndex, emailIdx!))
      .limit(1);
    if (existing[0] && existing[0].studentId !== studentId) {
      return { ok: false, error: "Gmail này đã được liên kết với tài khoản khác." };
    }

    await lmsDb
      .update(lmsUser)
      .set({ email: emailCipher, emailIndex: emailIdx })
      .where(eq(lmsUser.studentId, studentId));
    return { ok: true };
  } catch (e) {
    console.error("[linkGoogleEmail]", e);
    return { ok: false, error: "Không thể lưu. Vui lòng thử lại." };
  }
}

// ===== P-LMS-1: Tiến độ hoàn thành tài liệu =====

/** Danh sách materialId đã hoàn thành của HV. Dùng cho progress bar + toggle UI. */
export async function getMyCompletedMaterialIds(studentId: string): Promise<string[]> {
  const rows = await lmsDb
    .select({ materialId: tcMaterialProgress.materialId })
    .from(tcMaterialProgress)
    .where(eq(tcMaterialProgress.studentId, studentId));
  return rows.map((r) => r.materialId);
}

/** S0: Khóa học của tôi (qua enrollment). */
export async function getMyCourses(studentId: string) {
  const enrs = await myEnrollments(studentId);
  const courseIds = [...new Set(enrs.map(e => e.courseId).filter(Boolean))] as string[];
  if (courseIds.length === 0) return [];
  return lmsDb
    .select({
      id: tcCourse.id,
      title: tcCourse.title,
      slug: tcCourse.slug,
      descriptionMd: tcCourse.descriptionMd,
      status: tcCourse.status,
    })
    .from(tcCourse)
    .where(inArray(tcCourse.id, courseIds));
}

// ===== P-LMS-1: Bảng xếp hạng lớp =====

/**
 * Bảng xếp hạng lớp (top N học viên theo điểm TB).
 * Tên ẩn danh trừ chính mình (R-JL-STUDENT-PII: không lộ tên HV khác).
 *
 * Trả về: { rank, displayName, avgScore, isMe }[].
 * displayName = tên thật nếu isMe, "Bạn học #N" nếu HV khác.
 */
export async function getClassLeaderboard(
  studentId: string,
  classId: string,
  limit = 10,
) {
  // 1) Kiểm tra membership — chống IDOR (chỉ xem leaderboard lớp mình)
  await assertMembership(studentId, classId);

  // 2) Lấy tất cả assignment của lớp
  const assignments = await lmsDb
    .select({ id: tcAssignment.id })
    .from(tcAssignment)
    .where(eq(tcAssignment.classId, classId));
  if (assignments.length === 0) return [];

  const assignmentIds = assignments.map((a) => a.id);

  // 3) Lấy tất cả grades cho các assignment đó
  const grades = await lmsDb
    .select({
      studentId: tcGrade.studentId,
      score: tcGrade.score,
    })
    .from(tcGrade)
    .where(inArray(tcGrade.assignmentId, assignmentIds));

  if (grades.length === 0) return [];

  // 4) Tính điểm TB mỗi HV
  const scoreMap = new Map<string, { total: number; count: number }>();
  for (const g of grades) {
    if (g.score == null) continue;
    const entry = scoreMap.get(g.studentId) ?? { total: 0, count: 0 };
    entry.total += g.score;
    entry.count += 1;
    scoreMap.set(g.studentId, entry);
  }

  // 5) Sắp xếp DESC
  const sorted = [...scoreMap.entries()]
    .map(([sid, { total, count }]) => ({
      studentId: sid,
      avgScore: Math.round((total / count) * 10) / 10,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // 6) Lấy tên HV hiện tại (giải mã an toàn) — chỉ tên mình, KHÔNG lấy tên HV khác
  let myName: string | null = null;
  const myStudentRows = await lmsDb
    .select({ name: tcStudent.name })
    .from(tcStudent)
    .where(eq(tcStudent.id, studentId))
    .limit(1);
  if (myStudentRows[0]) {
    myName = safeDecrypt(myStudentRows[0].name);
  }

  // 7) Tìm rank của mình (có thể ngoài top N)
  const myRankIndex = sorted.findIndex((s) => s.studentId === studentId);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  // 8) Ẩn danh: "Bạn học #1", "Bạn học #2"... trừ chính mình
  let anonCounter = 0;
  const top = sorted.slice(0, limit).map((s, idx) => {
    const isMe = s.studentId === studentId;
    if (!isMe) anonCounter++;
    return {
      rank: idx + 1,
      displayName: isMe ? (myName ?? "Bạn") : `Bạn học #${anonCounter}`,
      avgScore: s.avgScore,
      isMe,
    };
  });

  // Nếu mình không nằm trong top N → thêm vào cuối (có ghi chú rank thật)
  if (myRank != null && myRank > limit) {
    const myEntry = sorted[myRankIndex];
    top.push({
      rank: myRank,
      displayName: myName ?? "Bạn",
      avgScore: myEntry.avgScore,
      isMe: true,
    });
  }

  return top;
}

/** P-LMS-2: Mục lục khóa học (modules + lessons) cho student. */
export async function getMyCourseOutline(studentId: string, courseId: string) {
  // Verify enrollment
  const enrs = await myEnrollments(studentId);
  const enrolled = enrs.some(e => e.courseId === courseId);
  if (!enrolled) throw new Error("FORBIDDEN: không tham gia khóa này.");

  const modules = await lmsDb
    .select()
    .from(tcModule)
    .where(eq(tcModule.courseId, courseId))
    .orderBy(asc(tcModule.position));

  if (modules.length === 0) return [];

  const lessons = await lmsDb
    .select()
    .from(tcLesson)
    .where(inArray(tcLesson.moduleId, modules.map(m => m.id)))
    .orderBy(asc(tcLesson.position));

  // Get progress for this student
  const personId = await getMyPersonId(studentId);
  let progressItems: { itemId: string; status: string }[] = [];
  if (personId) {
    progressItems = await lmsDb
      .select({ itemId: tcProgress.itemId, status: tcProgress.status })
      .from(tcProgress)
      .where(and(
        eq(tcProgress.personId, personId),
        eq(tcProgress.courseId, courseId),
      ));
  }
  const doneSet = new Set(progressItems.filter(p => p.status === "done").map(p => p.itemId));

  const lessonsByModule = new Map<string, (typeof lessons[0] & { done: boolean })[]>();
  for (const l of lessons) {
    const arr = lessonsByModule.get(l.moduleId) ?? [];
    arr.push({ ...l, done: doneSet.has(l.id) });
    lessonsByModule.set(l.moduleId, arr);
  }

  return modules.map(m => ({
    id: m.id,
    title: m.title,
    descriptionMd: m.descriptionMd,
    position: m.position,
    lessons: lessonsByModule.get(m.id) ?? [],
  }));
}

/** P-LMS-2: Tính % tiến độ khóa. */
export async function getMyCourseProgress(studentId: string, courseId: string): Promise<{ done: number; total: number; pct: number }> {
  const personId = await getMyPersonId(studentId);
  if (!personId) return { done: 0, total: 0, pct: 0 };

  // Count total lessons in course
  const modules = await lmsDb.select({ id: tcModule.id }).from(tcModule)
    .where(eq(tcModule.courseId, courseId));
  if (modules.length === 0) return { done: 0, total: 0, pct: 0 };

  const lessons = await lmsDb.select({ id: tcLesson.id }).from(tcLesson)
    .where(inArray(tcLesson.moduleId, modules.map(m => m.id)));
  const total = lessons.length;
  if (total === 0) return { done: 0, total: 0, pct: 0 };

  // Count completed lessons
  const progress = await lmsDb
    .select({ itemId: tcProgress.itemId })
    .from(tcProgress)
    .where(and(
      eq(tcProgress.personId, personId),
      eq(tcProgress.courseId, courseId),
      eq(tcProgress.itemType, "lesson"),
      eq(tcProgress.status, "done"),
    ));
  const done = progress.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// ===== P-LMS-3: Quiz queries =====

/** P-LMS-3: Lấy danh sách quiz của khóa học (published only). */
export async function getMyCourseQuizzes(studentId: string, courseId: string) {
  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === courseId)) throw new Error("FORBIDDEN");

  const personId = await getMyPersonId(studentId);
  const quizzes = await lmsDb.select({
    id: tcQuiz.id, title: tcQuiz.title, courseId: tcQuiz.courseId,
    lessonId: tcQuiz.lessonId, timeLimitSec: tcQuiz.timeLimitSec,
    maxAttempts: tcQuiz.maxAttempts, status: tcQuiz.status,
  }).from(tcQuiz)
    .where(and(eq(tcQuiz.courseId, courseId), eq(tcQuiz.status, "published")));

  // Get attempt counts per quiz
  const result = [];
  for (const q of quizzes) {
    let attemptsUsed = 0;
    let bestScore: number | null = null;
    if (personId) {
      const attempts = await lmsDb.select({ score: tcQuizAttempt.score })
        .from(tcQuizAttempt)
        .where(and(eq(tcQuizAttempt.quizId, q.id), eq(tcQuizAttempt.personId, personId)));
      attemptsUsed = attempts.length;
      const scores = attempts.map(a => a.score).filter((s): s is number => s != null);
      if (scores.length > 0) bestScore = Math.max(...scores);
    }
    result.push({ ...q, attemptsUsed, bestScore });
  }
  return result;
}

/** P-LMS-3: Lấy lịch sử làm bài quiz. */
export async function getMyQuizAttempts(studentId: string, quizId: string) {
  const personId = await getMyPersonId(studentId);
  if (!personId) return [];
  return lmsDb.select({
    id: tcQuizAttempt.id,
    score: tcQuizAttempt.score,
    maxScore: tcQuizAttempt.maxScore,
    startedAt: tcQuizAttempt.startedAt,
    submittedAt: tcQuizAttempt.submittedAt,
  }).from(tcQuizAttempt)
    .where(and(eq(tcQuizAttempt.quizId, quizId), eq(tcQuizAttempt.personId, personId)));
}

/** P-LMS-5: Lấy chứng chỉ của tôi. */
export async function getMyCertificates(studentId: string) {
  const personId = await getMyPersonId(studentId);
  if (!personId) return [];
  return lmsDb.select({
    id: tcCertificate.id,
    courseId: tcCertificate.courseId,
    issuedAt: tcCertificate.issuedAt,
    verifyCode: tcCertificate.verifyCode,
    revoked: tcCertificate.revoked,
  }).from(tcCertificate)
    .where(and(eq(tcCertificate.personId, personId), eq(tcCertificate.revoked, 0)));
}

/** P-LMS-5: Điểm tổng kết theo trọng số nhóm của học viên. */
export async function getMyWeightedGrade(studentId: string, courseId: string) {
  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === courseId)) throw new Error("FORBIDDEN");

  // Lấy categories
  const categories = await lmsDb.select().from(tcGradeCategory)
    .where(eq(tcGradeCategory.courseId, courseId))
    .orderBy(asc(tcGradeCategory.position));
  if (categories.length === 0) return { weightedScore: null, details: [] };

  // Lấy classes của course
  const classes = await lmsDb.select({ id: tcClass.id }).from(tcClass)
    .where(eq(tcClass.courseId, courseId));
  const classIds = classes.map(c => c.id);
  if (classIds.length === 0) return { weightedScore: null, details: [] };

  // Lấy assignments (có categoryId)
  const assignments = await lmsDb.select().from(tcAssignment)
    .where(inArray(tcAssignment.classId, classIds));
  const assignmentIds = assignments.map(a => a.id);
  if (assignmentIds.length === 0) return { weightedScore: null, details: [] };

  // Lấy grades của student
  const grades = await lmsDb.select().from(tcGrade)
    .where(and(eq(tcGrade.studentId, studentId), inArray(tcGrade.assignmentId, assignmentIds)));
  const gradeByAssignment = new Map(grades.map(g => [g.assignmentId, g]));

  // Tính điểm theo nhóm
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

/** P-LMS-4: Bài code published của khóa. */
export async function getMyCourseProblems(studentId: string, courseId: string) {
  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === courseId)) throw new Error("FORBIDDEN");
  const personId = await getMyPersonId(studentId);

  const problems = await lmsDb.select({
    id: tcCodeProblem.id, title: tcCodeProblem.title,
    lessonId: tcCodeProblem.lessonId, languagesJson: tcCodeProblem.languagesJson,
    totalWeight: tcCodeProblem.totalWeight, status: tcCodeProblem.status,
  }).from(tcCodeProblem)
    .where(and(eq(tcCodeProblem.courseId, courseId), eq(tcCodeProblem.status, "published")));

  const result = [];
  for (const p of problems) {
    let bestScore: number | null = null;
    let submissionCount = 0;
    if (personId) {
      const subs = await lmsDb.select({ score: tcCodeSubmission.score })
        .from(tcCodeSubmission)
        .where(and(eq(tcCodeSubmission.problemId, p.id), eq(tcCodeSubmission.personId, personId), eq(tcCodeSubmission.status, "done")));
      submissionCount = subs.length;
      const scores = subs.map(s => s.score).filter((s): s is number => s != null);
      if (scores.length > 0) bestScore = Math.max(...scores);
    }
    result.push({ ...p, bestScore, submissionCount });
  }
  return result;
}

/** P-LMS-4: Lịch sử nộp code. */
export async function getMyCodeSubmissions(studentId: string, problemId: string) {
  const personId = await getMyPersonId(studentId);
  if (!personId) return [];
  return lmsDb.select({
    id: tcCodeSubmission.id,
    language: tcCodeSubmission.language,
    status: tcCodeSubmission.status,
    score: tcCodeSubmission.score,
    passedCount: tcCodeSubmission.passedCount,
    totalCount: tcCodeSubmission.totalCount,
    verdict: tcCodeSubmission.verdict,
    createdAt: tcCodeSubmission.createdAt,
  }).from(tcCodeSubmission)
    .where(and(eq(tcCodeSubmission.problemId, problemId), eq(tcCodeSubmission.personId, personId)));
}

// ===== P-LMS-6: Forum + Enrollment =====

/** Lấy threads của khóa (enrollment check). */
export async function getMyCourseThreads(studentId: string, courseId: string) {
  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === courseId)) throw new Error("FORBIDDEN");

  const threads = await lmsDb.select({
    id: tcThread.id,
    courseId: tcThread.courseId,
    lessonId: tcThread.lessonId,
    authorType: tcThread.authorType,
    authorRef: tcThread.authorRef,
    title: tcThread.title,
    status: tcThread.status,
    createdAt: tcThread.createdAt,
  }).from(tcThread)
    .where(eq(tcThread.courseId, courseId))
    .orderBy(desc(tcThread.createdAt));

  // Đếm số post mỗi thread
  const result = [];
  for (const t of threads) {
    const posts = await lmsDb.select({ id: tcPost.id })
      .from(tcPost)
      .where(and(eq(tcPost.threadId, t.id), eq(tcPost.hidden, 0)));
    result.push({ ...t, postCount: posts.length });
  }
  return result;
}

/** Lấy posts của thread (enrollment check, ẩn post hidden). */
export async function getThreadPosts(studentId: string, threadId: string) {
  // Load thread → enrollment check
  const thread = (await lmsDb.select().from(tcThread).where(eq(tcThread.id, threadId)).limit(1))[0];
  if (!thread) throw new Error("Thread không tồn tại.");

  const enrs = await myEnrollments(studentId);
  if (!enrs.some(e => e.courseId === thread.courseId)) throw new Error("FORBIDDEN");

  return lmsDb.select({
    id: tcPost.id,
    threadId: tcPost.threadId,
    authorType: tcPost.authorType,
    authorRef: tcPost.authorRef,
    bodyMd: tcPost.bodyMd,
    parentId: tcPost.parentId,
    hidden: tcPost.hidden,
    createdAt: tcPost.createdAt,
  }).from(tcPost)
    .where(and(eq(tcPost.threadId, threadId), eq(tcPost.hidden, 0)))
    .orderBy(asc(tcPost.createdAt));
}

/** Kiểm tra mã tham gia còn hợp lệ không (public check). */
export async function checkEnrolCode(code: string) {
  const codes = await lmsDb.select({
    id: classEnrolCode.id,
    courseId: classEnrolCode.courseId,
    active: classEnrolCode.active,
    maxUses: classEnrolCode.maxUses,
    usedCount: classEnrolCode.usedCount,
    expiresAt: classEnrolCode.expiresAt,
  }).from(classEnrolCode)
    .where(and(eq(classEnrolCode.code, code.toUpperCase().trim()), eq(classEnrolCode.active, 1)))
    .limit(1);
  const c = codes[0];
  if (!c) return { valid: false, reason: "Mã không tồn tại." };
  if (c.expiresAt && Date.now() > c.expiresAt) return { valid: false, reason: "Mã hết hạn." };
  if (c.maxUses && c.usedCount >= c.maxUses) return { valid: false, reason: "Mã hết lượt." };
  return { valid: true, courseId: c.courseId };
}
