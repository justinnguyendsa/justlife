import { spawn } from "child_process";
import type { CodeJudge, CodeRunRequest, CodeRunResult } from "./code-judge";

// P-LMS-4 Option 3A: Local subprocess judge (ADR-003).
// 🛡️ CHỈ CHO DEV — CHẶN production (code HV chạy KHÔNG sandbox).
// Guard: NODE_ENV=production → throw.

const LANGUAGE_COMMANDS: Record<string, { cmd: string; args: (file: string) => string[] }> = {
  python: { cmd: "python", args: (f) => [f] },
  javascript: { cmd: "node", args: (f) => [f] },
  typescript: { cmd: "npx", args: (f) => ["tsx", f] },
};

export class LocalJudge implements CodeJudge {
  constructor() {
    // 🛡️ Guard cứng: KHÔNG cho chạy ở production.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[code-judge-local] LocalJudge BỊ CẤM ở production. " +
        "Dùng CODE_JUDGE_ADAPTER=piston với Piston self-host."
      );
    }
  }

  async isAvailable(language: string): Promise<boolean> {
    return language in LANGUAGE_COMMANDS;
  }

  async run(req: CodeRunRequest): Promise<CodeRunResult> {
    if (process.env.NODE_ENV === "production") {
      return { stdout: "", stderr: "BLOCKED: LocalJudge không chạy production.", exitCode: 1, timeMs: 0, timedOut: false };
    }

    const langConfig = LANGUAGE_COMMANDS[req.language];
    if (!langConfig) {
      return { stdout: "", stderr: `Ngôn ngữ '${req.language}' không hỗ trợ.`, exitCode: 1, timeMs: 0, timedOut: false };
    }

    // Ghi code ra file tạm
    const os = await import("os");
    const fs = await import("fs");
    const path = await import("path");
    const ext = req.language === "python" ? ".py" : req.language === "typescript" ? ".ts" : ".js";
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `jl_judge_${Date.now()}${ext}`);
    fs.writeFileSync(tmpFile, req.sourceCode, "utf-8");

    const startTime = Date.now();

    return new Promise<CodeRunResult>((resolve) => {
      const proc = spawn(langConfig.cmd, langConfig.args(tmpFile), {
        timeout: req.timeLimitMs,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NODE_ENV: "test" }, // Không leak production env
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const MAX_OUTPUT = 1024 * 64; // 64KB max output

      proc.stdout.on("data", (data: Buffer) => {
        if (stdout.length < MAX_OUTPUT) stdout += data.toString();
      });
      proc.stderr.on("data", (data: Buffer) => {
        if (stderr.length < MAX_OUTPUT) stderr += data.toString();
      });

      // Gửi stdin
      if (req.stdin) {
        proc.stdin.write(req.stdin);
      }
      proc.stdin.end();

      proc.on("close", (code) => {
        const timeMs = Date.now() - startTime;
        // Cleanup
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

        resolve({
          stdout: stdout.trimEnd(),
          stderr: stderr.trimEnd(),
          exitCode: code ?? 1,
          timeMs,
          timedOut,
        });
      });

      proc.on("error", (err) => {
        const timeMs = Date.now() - startTime;
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        if (err.message.includes("ETIMEDOUT") || err.message.includes("killed")) {
          timedOut = true;
        }
        resolve({
          stdout: stdout.trimEnd(),
          stderr: err.message,
          exitCode: 1,
          timeMs,
          timedOut,
        });
      });

      // Extra timeout safety net
      setTimeout(() => {
        if (!proc.killed) {
          timedOut = true;
          proc.kill("SIGKILL");
        }
      }, req.timeLimitMs + 500);
    });
  }
}
