import { NextRequest, NextResponse } from "next/server";
import { lmsDb } from "@/db/lms/client";
import { tcCodeProblem, tcTestCase, tcCodeSubmission, tcCodeRun, enrollment } from "@/db/lms/schema";
import { eq, and, inArray } from "drizzle-orm";
import { genId } from "@/lib/id";
import { logAccess } from "@/lib/lms/audit";
import { getSessionStudentId, getMyPersonId } from "@/lib/lms/portal-queries";
import { getCodeJudge } from "@/lib/lms/code-judge";

// P-LMS-4: Nộp code + chấm tự động (ADR-003 QĐ3).
// sourceCode mã hóa at-rest. Test ẩn: CHỈ trả pass/fail.

function safeDecrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.startsWith("v1:")) {
    try {
      const { decryptFieldOpt } = require("@/lib/lms/crypto");
      return decryptFieldOpt(value);
    } catch { return value; }
  }
  return value;
}

function safeEncrypt(value: string | null | undefined): string | null {
  if (value == null) return null;
  try {
    const { encryptFieldOpt } = require("@/lib/lms/crypto");
    return encryptFieldOpt(value) ?? value;
  } catch { return value; }
}

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const studentId = await getSessionStudentId();
  if (!studentId) return err("Chưa đăng nhập.", 401);
  const personId = await getMyPersonId(studentId);
  if (!personId) return err("Chưa có hồ sơ.", 403);

  // 2. Parse body
  let body: { problemId: string; language: string; sourceCode: string };
  try { body = await req.json(); } catch { return err("Dữ liệu không hợp lệ."); }
  const { problemId, language, sourceCode } = body;
  if (!problemId || !language || !sourceCode) return err("Thiếu dữ liệu.");

  // 3. Load problem
  const problem = (await lmsDb.select().from(tcCodeProblem).where(eq(tcCodeProblem.id, problemId)).limit(1))[0];
  if (!problem) return err("Không tìm thấy bài.", 404);
  if (problem.status !== "published") return err("Bài chưa mở.");

  // 4. Check language
  const allowedLangs = JSON.parse(problem.languagesJson) as string[];
  if (!allowedLangs.includes(language)) return err(`Ngôn ngữ '${language}' không hỗ trợ cho bài này.`);

  // 5. Check enrollment
  const enrolled = await lmsDb.select({ id: enrollment.id }).from(enrollment)
    .where(and(eq(enrollment.personId, personId), eq(enrollment.courseId, problem.courseId), eq(enrollment.status, "active")))
    .limit(1);
  if (enrolled.length === 0) return err("Không tham gia khóa.", 403);

  // 6. Create submission (queued)
  const subId = genId();
  const encSource = safeEncrypt(sourceCode);
  await lmsDb.insert(tcCodeSubmission).values({
    id: subId, problemId, personId, language,
    sourceCode: encSource, status: "queued",
    createdAt: Date.now(),
  });

  // 7. Load test cases
  const testCases = await lmsDb.select().from(tcTestCase)
    .where(eq(tcTestCase.problemId, problemId));
  if (testCases.length === 0) return err("Bài chưa có test case.");

  // 8. Run judge
  let judge;
  try { judge = await getCodeJudge(); } catch (e) {
    await lmsDb.update(tcCodeSubmission).set({ status: "error", verdict: "JUDGE_UNAVAILABLE" })
      .where(eq(tcCodeSubmission.id, subId));
    return err("Hệ thống chấm chưa sẵn sàng.", 503);
  }

  // 9. Update status to running
  await lmsDb.update(tcCodeSubmission).set({ status: "running" }).where(eq(tcCodeSubmission.id, subId));

  // 10. Execute test cases
  let passedCount = 0;
  let totalWeight = 0;
  let passedWeight = 0;
  let verdict = "AC";

  for (const tc of testCases) {
    const rawInput = safeDecrypt(tc.input) ?? "";
    const rawExpected = safeDecrypt(tc.expectedOutput) ?? "";

    const result = await judge.run({
      language, sourceCode, stdin: rawInput,
      timeLimitMs: problem.timeLimitMs, memLimitMb: problem.memLimitMb,
    });

    const passed = !result.timedOut && result.exitCode === 0 &&
      result.stdout.trim() === rawExpected.trim();

    if (passed) { passedCount++; passedWeight += tc.weight; }
    else if (verdict === "AC") {
      if (result.timedOut) verdict = "TLE";
      else if (result.exitCode !== 0) verdict = "RE";
      else verdict = "WA";
    }
    totalWeight += tc.weight;

    // Save run result (test ẩn: KHÔNG lưu stdout/stderr)
    await lmsDb.insert(tcCodeRun).values({
      id: genId(), submissionId: subId, testCaseId: tc.id,
      passed: passed ? 1 : 0, timeMs: result.timeMs,
      stdout: tc.isHidden ? null : result.stdout.slice(0, 2000),
      stderr: tc.isHidden ? null : result.stderr.slice(0, 2000),
    });
  }

  // 11. Final score
  const score = totalWeight > 0 ? (passedWeight / totalWeight) * problem.totalWeight : 0;
  if (passedCount === testCases.length) verdict = "AC";

  await lmsDb.update(tcCodeSubmission).set({
    status: "done", score, passedCount, totalCount: testCases.length,
    verdict, ranAt: Date.now(),
  }).where(eq(tcCodeSubmission.id, subId));

  // 12. Audit
  await logAccess({ actor: studentId, action: "submit_code", targetType: "code_submission", targetId: subId });

  return NextResponse.json({
    ok: true, submissionId: subId,
    score: Math.round(score * 100) / 100,
    passedCount, totalCount: testCases.length,
    verdict,
  });
}
