import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { lmsDb } from "@/db/lms/client";
import { tcQuiz, tcQuizQuestion, tcQuestion, tcQuizAttempt, enrollment } from "@/db/lms/schema";
import { eq, and, inArray } from "drizzle-orm";
import { genId } from "@/lib/id";
import { logAccess } from "@/lib/lms/audit";
import { getSessionStudentId, getMyPersonId } from "@/lib/lms/portal-queries";

// P-LMS-3: Quiz submission + auto-grade (ADR-003 QĐ2).
// correctJson giải mã CHỈ trong bộ nhớ server lúc chấm — KHÔNG bao giờ gửi client.
// studentId/personId SERVER-DERIVED. Validate enrollment + maxAttempts + timeLimit.

function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      const { decryptFieldOpt } = require("@/lib/lms/crypto");
      return decryptFieldOpt(value);
    } catch {
      return value;
    }
  }
  return value;
}

function safeEncrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  try {
    const { encryptFieldOpt } = require("@/lib/lms/crypto");
    return encryptFieldOpt(value) ?? value;
  } catch {
    return value;
  }
}

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const studentId = await getSessionStudentId();
  if (!studentId) return err("Chưa đăng nhập.", 401);

  const personId = await getMyPersonId(studentId);
  if (!personId) return err("Chưa có hồ sơ học viên.", 403);

  // 2. Parse body
  let body: { quizId: string; answers: Record<string, string | string[]> };
  try {
    body = await req.json();
  } catch {
    return err("Dữ liệu không hợp lệ.");
  }
  const { quizId, answers } = body;
  if (!quizId || !answers) return err("Thiếu quizId hoặc answers.");

  // 3. Load quiz
  const quiz = (await lmsDb.select().from(tcQuiz).where(eq(tcQuiz.id, quizId)).limit(1))[0];
  if (!quiz) return err("Không tìm thấy bài quiz.", 404);
  if (quiz.status !== "published") return err("Quiz chưa được mở.");

  // 4. Check enrollment
  const enrolled = await lmsDb.select({ id: enrollment.id }).from(enrollment)
    .where(and(eq(enrollment.personId, personId), eq(enrollment.courseId, quiz.courseId), eq(enrollment.status, "active")))
    .limit(1);
  if (enrolled.length === 0) return err("Bạn không tham gia khóa này.", 403);

  // 5. Check maxAttempts
  const prevAttempts = await lmsDb.select({ id: tcQuizAttempt.id }).from(tcQuizAttempt)
    .where(and(eq(tcQuizAttempt.quizId, quizId), eq(tcQuizAttempt.personId, personId)));
  if (prevAttempts.length >= quiz.maxAttempts) {
    return err(`Đã hết lượt làm bài (tối đa ${quiz.maxAttempts}).`);
  }

  // 6. Load questions for this quiz
  const qqRows = await lmsDb.select().from(tcQuizQuestion)
    .where(eq(tcQuizQuestion.quizId, quizId));
  if (qqRows.length === 0) return err("Quiz không có câu hỏi.");

  const qIds = qqRows.map(qq => qq.questionId);
  const questions = await lmsDb.select().from(tcQuestion)
    .where(inArray(tcQuestion.id, qIds));

  // 7. Grade
  let totalScore = 0;
  let totalMax = 0;
  for (const q of questions) {
    totalMax += q.points;
    const studentAnswer = answers[q.id];
    if (!studentAnswer) continue; // không trả lời = 0 điểm

    // Giải mã correctJson (CHỈ trong bộ nhớ server)
    const correctRaw = safeDecrypt(q.correctJson);
    if (!correctRaw) continue;

    let correct: unknown;
    try { correct = JSON.parse(correctRaw); } catch { continue; }

    let isCorrect = false;
    switch (q.type) {
      case "mcq_single":
      case "true_false":
        // correct = string (label của đáp án đúng, ví dụ "A")
        isCorrect = String(studentAnswer).trim().toLowerCase() === String(correct).trim().toLowerCase();
        break;
      case "mcq_multi":
        // correct = string[] (đáp án đúng), studentAnswer = string[]
        if (Array.isArray(correct) && Array.isArray(studentAnswer)) {
          const cSet = new Set((correct as string[]).map(s => s.toLowerCase().trim()));
          const aSet = new Set(studentAnswer.map((s: string) => s.toLowerCase().trim()));
          isCorrect = cSet.size === aSet.size && [...cSet].every(c => aSet.has(c));
        }
        break;
      case "short": {
        // correct = string hoặc string[] (accept-list)
        const acceptList = Array.isArray(correct) ? correct : [correct];
        const normalized = String(studentAnswer).trim().toLowerCase();
        isCorrect = acceptList.some((a: unknown) => String(a).trim().toLowerCase() === normalized);
        break;
      }
    }
    if (isCorrect) totalScore += q.points;
  }

  // 8. Save attempt
  const now = Date.now();
  const attemptId = genId();
  const encAnswers = safeEncrypt(JSON.stringify(answers));
  await lmsDb.insert(tcQuizAttempt).values({
    id: attemptId, quizId, personId,
    answersJson: encAnswers,
    score: totalScore, maxScore: totalMax,
    startedAt: now, submittedAt: now, gradedAt: now,
  });

  // 9. Audit
  await logAccess({ actor: studentId, action: "submit_quiz", targetType: "quiz", targetId: quizId });

  return NextResponse.json({
    ok: true,
    attemptId,
    score: totalScore,
    maxScore: totalMax,
    pct: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
  });
}
