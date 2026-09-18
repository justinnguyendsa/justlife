// P-LMS-4: CodeJudge adapter interface (ADR-003 QĐ3).
// Web app chỉ phụ thuộc interface. Implementation swap by env CODE_JUDGE_ADAPTER.
//
// Adapters:
//   - LocalJudge (3A): subprocess + timeout, CHỈ DEV. CHẶN production.
//   - PistonJudge (3C): Piston self-host, cho production (implement sau khi có VPS).

export interface CodeRunRequest {
  language: string;
  sourceCode: string;
  stdin: string;
  timeLimitMs: number;
  memLimitMb: number;
}

export interface CodeRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  memKb?: number;
  timedOut: boolean;
  error?: string;
}

export interface CodeJudge {
  /** Chạy code với stdin, trả stdout/stderr/timing. */
  run(req: CodeRunRequest): Promise<CodeRunResult>;
  /** Check judge sẵn sàng (ngôn ngữ hỗ trợ). */
  isAvailable(language: string): Promise<boolean>;
}

// Factory: chọn adapter theo env.
export async function getCodeJudge(): Promise<CodeJudge> {
  const adapter = process.env.CODE_JUDGE_ADAPTER ?? "local";
  switch (adapter) {
    case "piston":
      // TODO: implement PistonJudge khi có VPS
      throw new Error("[code-judge] PistonJudge chưa implement. Dùng CODE_JUDGE_ADAPTER=local.");
    case "local":
    default:
      const { LocalJudge } = await import("./code-judge-local");
      return new LocalJudge();
  }
}
