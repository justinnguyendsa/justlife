import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { tcMaterialProgress } from "@/db/lms/schema";
import { getSessionStudentId } from "@/lib/lms/portal-queries";
import { genId } from "@/lib/id";

// POST /api/lms/material-progress — toggle hoàn thành tài liệu (P-LMS-1).
// Bất biến:
//  - studentId TỪ session (nguồn duy nhất — chống IDOR).
//  - Chỉ chạm lmsDb (R-JL-TWO-FACES-01).
//  - completed=true → upsert; completed=false → delete record.
//
// 🗣️ Bình dân: đánh dấu "đã đọc" một tài liệu, hoặc bỏ đánh dấu.

export const runtime = "nodejs";

function err(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const studentId = await getSessionStudentId();
  if (!studentId) return err("Chưa đăng nhập.", 401);

  let body: { materialId?: string; completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return err("Dữ liệu không hợp lệ.", 400);
  }

  const { materialId, completed } = body;
  if (!materialId || typeof materialId !== "string") {
    return err("Thiếu materialId.", 400);
  }

  if (completed) {
    // Upsert: chỉ thêm nếu chưa có
    const existing = await lmsDb
      .select({ id: tcMaterialProgress.id })
      .from(tcMaterialProgress)
      .where(
        and(
          eq(tcMaterialProgress.materialId, materialId),
          eq(tcMaterialProgress.studentId, studentId),
        ),
      )
      .limit(1);
    if (!existing[0]) {
      await lmsDb.insert(tcMaterialProgress).values({
        id: genId(),
        materialId,
        studentId,
        completedAt: Date.now(),
      });
    }
  } else {
    // Delete completion record
    await lmsDb
      .delete(tcMaterialProgress)
      .where(
        and(
          eq(tcMaterialProgress.materialId, materialId),
          eq(tcMaterialProgress.studentId, studentId),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}

// Đảm bảo chỉ POST: từ chối các method khác rõ ràng (an toàn).
export async function GET() {
  return err("Phương thức không được hỗ trợ.", 405);
}
