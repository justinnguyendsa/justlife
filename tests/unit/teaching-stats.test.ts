import { describe, it, expect } from "vitest";
import { assignmentSubmissionStats, classSummary, groupBy, studentProgress, type GradeRef, type SubRef } from "@/lib/teaching-stats";

// SPEC-Perf-P1 T09: thống kê tính trong bộ nhớ phải trùng cách tính cũ (truy vấn lẻ theo từng bài tập).

const students = ["s1", "s2", "s3"];
const assignments = ["a1", "a2"];
const subs: SubRef[] = [
  { studentId: "s1", assignmentId: "a1" },
  { studentId: "s1", assignmentId: "a1" }, // nộp lại — chỉ tính 1 lần
  { studentId: "s1", assignmentId: "a2" },
  { studentId: "s2", assignmentId: "a1" },
  { studentId: "x9", assignmentId: "a1" }, // học viên ngoài lớp — bị loại
  { studentId: "s3", assignmentId: "zz" }, // bài tập lớp khác — bị loại
];
const grades: GradeRef[] = [
  { studentId: "s1", assignmentId: "a1", score: 8 },
  { studentId: "s1", assignmentId: "a2", score: null }, // có dòng điểm nhưng chưa chấm số
  { studentId: "x9", assignmentId: "a1", score: 4 }, // ngoài lớp: vẫn tính vào điểm TB lớp (như hàm cũ)
  { studentId: "s2", assignmentId: "zz", score: 10 }, // bài tập lớp khác — bị loại
];

describe("classSummary", () => {
  it("lớp rỗng hoặc chưa có bài tập trả về 0 / null", () => {
    expect(classSummary([], assignments, subs, grades)).toEqual({ studentCount: 0, assignmentCount: 2, avgSubmissionPct: 0, avgScore: null });
    expect(classSummary(students, [], subs, grades)).toEqual({ studentCount: 3, assignmentCount: 0, avgSubmissionPct: 0, avgScore: null });
  });

  it("% nộp chỉ tính học viên trong lớp, điểm TB tính mọi điểm của bài tập lớp", () => {
    // s1: 2/2 = 100%, s2: 1/2 = 50%, s3: 0% → TB 50%. Điểm có số của a1/a2: 8 và 4 → 6.
    expect(classSummary(students, assignments, subs, grades)).toEqual({ studentCount: 3, assignmentCount: 2, avgSubmissionPct: 50, avgScore: 6 });
  });
});

describe("assignmentSubmissionStats", () => {
  it("đếm HV đã nộp và HV nộp mà chưa có dòng điểm", () => {
    // a1: s1, s2 đã nộp (x9 ngoài lớp bị loại); s1 có dòng điểm → chờ chấm = s2.
    expect(assignmentSubmissionStats("a1", students, subs, grades)).toEqual({ totalStudents: 3, submittedCount: 2, pendingGradeCount: 1 });
    // a2: s1 đã nộp và có dòng điểm (dù score null) → không chờ chấm.
    expect(assignmentSubmissionStats("a2", students, subs, grades)).toEqual({ totalStudents: 3, submittedCount: 1, pendingGradeCount: 0 });
  });

  it("lớp không có học viên", () => {
    expect(assignmentSubmissionStats("a1", [], subs, grades)).toEqual({ totalStudents: 0, submittedCount: 0, pendingGradeCount: 0 });
  });
});

describe("studentProgress", () => {
  it("trả {} khi lớp chưa có bài tập hoặc học viên", () => {
    expect(studentProgress(students, [], subs, grades)).toEqual({});
    expect(studentProgress([], assignments, subs, grades)).toEqual({});
  });

  it("số bài đã nộp (không đếm trùng) và điểm TB bỏ qua điểm null", () => {
    expect(studentProgress(students, assignments, subs, grades)).toEqual({
      s1: { submitted: 2, total: 2, avgScore: 8 },
      s2: { submitted: 1, total: 2, avgScore: null },
      s3: { submitted: 0, total: 2, avgScore: null },
    });
  });

  it("làm tròn điểm TB 1 chữ số", () => {
    const g: GradeRef[] = [
      { studentId: "s1", assignmentId: "a1", score: 7 },
      { studentId: "s1", assignmentId: "a2", score: 8.25 },
    ];
    expect(studentProgress(["s1"], assignments, [], g).s1.avgScore).toBe(7.6);
  });
});

describe("groupBy", () => {
  it("mọi khoá đều có mặt, dòng lạ bị bỏ", () => {
    const rows = [{ k: "a", v: 1 }, { k: "b", v: 2 }, { k: "a", v: 3 }, { k: "z", v: 9 }];
    expect(groupBy(["a", "b", "c"], rows, (r) => r.k)).toEqual({
      a: [{ k: "a", v: 1 }, { k: "a", v: 3 }],
      b: [{ k: "b", v: 2 }],
      c: [],
    });
  });
});
