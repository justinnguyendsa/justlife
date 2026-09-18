import { NextRequest, NextResponse } from "next/server";
import { lmsDb } from "@/db/lms/client";
import { tcQuiz, tcQuizQuestion, tcQuestion, tcQuizAttempt, enrollment } from "@/db/lms/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionStudentId, getMyPersonId } from "@/lib/lms/portal-queries";
import { logAccess } from "@/lib/lms/audit";

// P-LMS-3: Bắt đầu làm quiz — trả stemMd + choicesJson (KHÔNG trả correctJson).
// Nếu shuffle=1: trộn thứ tự câu + đáp án.

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function POST(req: NextRequest) {
  const studentId = await getSessionStudentId();
  if (!studentId) return err("Chưa đăng nhập.", 401);

  const personId = await getMyPersonId(studentId);
  if (!personId) return err("Chưa có hồ sơ.", 403);

  let body: { quizId: string };
  try { body = await req.json(); } catch { return err("Dữ liệu không hợp lệ."); }

  const quiz = (await lmsDb.select().from(tcQuiz).where(eq(tcQuiz.id, body.quizId)).limit(1))[0];
  if (!quiz) return err("Không tìm thấy quiz.", 404);
  if (quiz.status !== "published") return err("Quiz chưa mở.");

  // Enrollment check
  const enrolled = await lmsDb.select({ id: enrollment.id }).from(enrollment)
    .where(and(eq(enrollment.personId, personId), eq(enrollment.courseId, quiz.courseId), eq(enrollment.status, "active")))
    .limit(1);
  if (enrolled.length === 0) return err("Không tham gia khóa.", 403);

  // Check attempts remaining
  const prevAttempts = await lmsDb.select({ id: tcQuizAttempt.id }).from(tcQuizAttempt)
    .where(and(eq(tcQuizAttempt.quizId, body.quizId), eq(tcQuizAttempt.personId, personId)));
  if (prevAttempts.length >= quiz.maxAttempts) return err(`Hết lượt (${quiz.maxAttempts}).`);

  // Load questions (KHÔNG trả correctJson)
  const qqRows = await lmsDb.select().from(tcQuizQuestion)
    .where(eq(tcQuizQuestion.quizId, body.quizId));
  const qIds = qqRows.map(qq => qq.questionId);
  if (qIds.length === 0) return err("Quiz không có câu.");

  const questions = await lmsDb.select({
    id: tcQuestion.id,
    type: tcQuestion.type,
    stemMd: tcQuestion.stemMd,
    choicesJson: tcQuestion.choicesJson,
    points: tcQuestion.points,
  }).from(tcQuestion).where(inArray(tcQuestion.id, qIds));

  // Order by position from quiz_question
  const posMap = new Map(qqRows.map(qq => [qq.questionId, qq.position]));
  let ordered = [...questions].sort((a, b) => (posMap.get(a.id) ?? 0) - (posMap.get(b.id) ?? 0));

  // Shuffle if enabled
  if (quiz.shuffle) {
    ordered = shuffleArray(ordered);
    // Shuffle choices within each question
    ordered = ordered.map(q => {
      if (q.choicesJson) {
        try {
          const choices = JSON.parse(q.choicesJson);
          if (Array.isArray(choices)) {
            return { ...q, choicesJson: JSON.stringify(shuffleArray(choices)) };
          }
        } catch { /* ignore */ }
      }
      return q;
    });
  }

  await logAccess({ actor: studentId, action: "start_quiz", targetType: "quiz", targetId: body.quizId });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      timeLimitSec: quiz.timeLimitSec,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed: prevAttempts.length,
    },
    questions: ordered,
    startedAt: Date.now(),
  });
}
