export const meta = {
  name: 'justlife-needs-analysis',
  description: 'Phân tích nhu cầu chủ dự án (Minh) theo nhiều mảng đời sống song song → tổng hợp thành PHƯƠNG ÁN BUILD platform (module map · pillars · roadmap phân phase · kiến trúc + multi-user · privacy · rủi ro · MVP). Read-only, không code.',
  whenToUse: 'Khi cần phân tích nhu cầu tổng thể và ra phương án xây dựng/roadmap cho justlife. Pass args:{brief} để override bối cảnh.',
  phases: [
    { title: 'Analyze', detail: '6 agent phân tích song song theo 6 mảng' },
    { title: 'Synthesize', detail: 'tổng hợp thành phương án build có roadmap' },
  ],
}

const BRIEF = (args && args.brief) || `
Minh, sinh 2001, 1m83, 57kg (BMI ~17 → THIẾU CÂN: mục tiêu thể hình là TĂNG cân/cơ lành mạnh, không phải giảm). Thích xanh dương + vàng, theo chủ nghĩa tối giản. Hay suy nghĩ nhiều → không làm dứt điểm 1 việc, nhảy từ việc này sang việc khác.

3 vai trò:
1) DATA ANALYST (team data 1 mình): làm hết Data Management/Engineering/Analysis/Governance + build tool nội bộ cho team (vibe coding). Nhận request nhiều bên, khối lượng lớn. KHÔNG sắp xếp & theo dõi tiến độ → trễ deadline, tăng ca.
2) TRỢ GIẢNG Data Analysis @ MindX (buổi tối, lịch linh hoạt theo lớp): dạy thực hành, điểm danh, nhận+chấm bài tập, nhận xét học viên. Đang dùng Notion, THIẾU: điểm danh, học viên đăng nhập nộp bài, chấm+nhận xét từng học viên, quản lý tài liệu, tái dùng nội dung khi mở lớp mới (không copy-paste). Hay trễ chấm bài/nhận xét.
3) HỌC VIÊN CAO HỌC Thạc sĩ Data Science (4 buổi/tuần, lịch linh hoạt): nhiều bài tập + đồ án. Không quản lý nội dung học, không phân bổ thời gian tự học/ôn → chưa rèn được kiến thức.

Muốn 1 PLATFORM quản lý TOÀN BỘ cuộc sống. Module dạy học: HỌC VIÊN ĐĂNG NHẬP + dùng tính năng hỗ trợ học (=> MULTI-USER). Dùng trên CẢ máy tính LẪN điện thoại (UIUX responsive 2 nền tảng).
Cải thiện thêm: ngoại hình/thể lực, ngoại ngữ, quản lý tài chính, chất lượng sống.
`

const ANALYZE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['domain', 'summary', 'jobsToBeDone', 'painPoints', 'mustHaveFeatures', 'dataModelHints', 'risks'],
  properties: {
    domain: { type: 'string' },
    summary: { type: 'string', description: '3-5 câu mảng này cần gì nhất' },
    jobsToBeDone: { type: 'array', items: { type: 'string' } },
    painPoints: { type: 'array', items: { type: 'string' } },
    mustHaveFeatures: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['feature', 'why', 'pillar', 'priority'],
        properties: {
          feature: { type: 'string' },
          why: { type: 'string' },
          pillar: { type: 'string', description: 'trụ/mảng nó phục vụ' },
          priority: { type: 'string', description: 'P0 | P1 | P2' },
        },
      },
    },
    dataModelHints: { type: 'array', items: { type: 'string' }, description: 'entity/field gợi ý' },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

phase('Analyze')

const lenses = [
  { key: 'work-da', label: 'analyze:work-da', prompt: `Bạn là PM + data lead phân tích mảng QUẢN LÝ CÔNG VIỆC CHÍNH của Minh (Data Analyst one-man team). Đọc .agents/context/product-vision.md để biết tinh thần (ship nhỏ, chống bloat) rồi phân tích theo BỐI CẢNH. Trọng tâm: cơ chế intake request từ nhiều bên, ưu tiên hoá, theo dõi tiến độ + deadline, WIP-limit + focus mode chống nhảy việc, cảnh báo trễ hạn. domain="work-da". Theo schema.` },
  { key: 'teaching-lms', label: 'analyze:teaching-lms', prompt: `Bạn là PM + architect phân tích MODULE DẠY HỌC của Minh — ĐÂY LÀ PHẦN MULTI-USER (học viên đăng nhập, nộp bài). Hiện dùng Notion còn thiếu nhiều. Phân tích LMS-lite: lớp/khoá, điểm danh, học viên nộp bài, chấm + nhận xét từng học viên, kho tài liệu, TÁI DÙNG nội dung khi mở lớp mới (template, không copy-paste), vai trò giảng viên vs học viên. NÊU RÕ: dữ liệu học viên là PII (MindX có thể có người chưa thành niên → nghĩa vụ privacy tăng) và hệ quả cần AUTH thật + phân quyền + DB hosted. Đánh dấu mọi feature multi-user. domain="teaching-lms". Theo schema.` },
  { key: 'study-masters', label: 'analyze:study-masters', prompt: `Bạn là PM phân tích mảng QUẢN LÝ HỌC TẬP CAO HỌC của Minh (Thạc sĩ Data Science, 4 buổi/tuần lịch linh hoạt, nhiều bài tập + đồ án). Pain: không quản lý nội dung học, không phân bổ thời gian tự học/ôn. Phân tích: quản lý môn học, deadline bài tập/đồ án, kế hoạch tự học + ôn tập, liên kết time-block, kho ghi chú/tài liệu học. domain="study-masters". Theo schema.` },
  { key: 'self-improve', label: 'analyze:self-improve', prompt: `Bạn là data-analyst (chuyên metric/habit) phân tích mảng TỰ CẢI THIỆN của Minh. LƯU Ý QUAN TRỌNG: Minh 1m83/57kg (BMI ~17, thiếu cân) → mục tiêu thể hình là TĂNG cân/cơ LÀNH MẠNH, KHÔNG phải giảm cân; KHÔNG đưa lời khuyên y tế/dinh dưỡng cụ thể, chỉ hỗ trợ THÓI QUEN (ăn đủ bữa, tập, ngủ) + theo dõi. Phân tích 4 mảng: thể lực, ngoại ngữ, tài chính cá nhân, chất lượng sống. Mỗi mảng: habit/streak + metric đo được + insight hành động. domain="self-improve". Theo schema.` },
  { key: 'cross-cutting', label: 'analyze:cross-cutting', prompt: `Bạn là PM + UX phân tích lớp XUYÊN SUỐT toàn platform. Trọng tâm: (1) time-blocking trên 3 vai có lịch khác nhau — đi làm giờ hành chính cố định, dạy buổi tối LỊCH LINH HOẠT, học cao học 4 buổi/tuần LINH HOẠT; (2) capture việc nhanh + nhắc nhở đúng lúc; (3) FOCUS / chống "suy nghĩ nhiều, nhảy việc" (single-tasking, "một việc lúc này", WIP limit, time-box); (4) responsive desktop + mobile (tối giản, xanh dương/vàng). domain="cross-cutting". Theo schema.` },
  { key: 'arch-privacy', label: 'analyze:arch-privacy', prompt: `Bạn là architect + privacy-auditor. Đọc .agents/context/tech-stack.md (TBD) + .agents/rules/00-critical-rules.md (đặc biệt R-JL-SINGLE-USER-01, R-JL-PRIVACY-01, R-JL-LOCAL-FIRST-01). Phân tích HỆ QUẢ KIẾN TRÚC + PRIVACY của brief. MÂU THUẪN CỐT LÕI: app gốc thiết kế SINGLE-USER + local-first, NHƯNG module dạy học cần MULTI-USER (học viên login). Phân tích mô hình "1 app 2 mặt": Personal OS (chỉ Minh) + LMS-lite (Minh + học viên). Khuyến nghị: stack cho desktop+mobile responsive (1 codebase), auth + phân quyền, DB hosted (không còn local-first thuần cho phần shared), tách dữ liệu personal (riêng tư tuyệt đối) vs shared (lớp học). Privacy: dữ liệu Minh + PII học viên (có thể minor) → nghĩa vụ pháp lý + tách kho dữ liệu. Liệt kê dataModelHints cho cả 2 mặt. domain="arch-privacy". Theo schema.` },
]

const analyses = (await parallel(lenses.map((l) => () => agent(
  `${l.prompt}\n\n=== BỐI CẢNH MINH (dùng chung) ===\n${BRIEF}`,
  { label: l.label, phase: 'Analyze', schema: ANALYZE_SCHEMA, agentType: 'Explore' }
)))).filter(Boolean)

log(`Analyze xong ${analyses.length}/${lenses.length} mảng. Tổng must-have: ${analyses.reduce((n, a) => n + (a.mustHaveFeatures ? a.mustHaveFeatures.length : 0), 0)} feature`)

phase('Synthesize')

const SYNTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['visionSummary', 'pillars', 'modules', 'architecture', 'roadmap', 'mvp', 'privacy', 'risks', 'openDecisions'],
  properties: {
    visionSummary: { type: 'string', description: '6-10 câu, song ngữ kỹ thuật + bình dân' },
    pillars: { type: 'array', items: { type: 'string' }, description: 'các trụ đã hiệu chỉnh theo brief mới' },
    modules: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'purpose', 'multiUser', 'keyFeatures'],
        properties: {
          name: { type: 'string' }, purpose: { type: 'string' },
          multiUser: { type: 'boolean' },
          keyFeatures: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    architecture: {
      type: 'object', additionalProperties: false,
      required: ['stackRecommendation', 'multiUserDecision', 'dataModel', 'hosting', 'responsiveApproach'],
      properties: {
        stackRecommendation: { type: 'string' },
        multiUserDecision: { type: 'string', description: 'xử lý mâu thuẫn single vs multi user thế nào' },
        dataModel: { type: 'string', description: 'tách personal vs shared' },
        hosting: { type: 'string' },
        responsiveApproach: { type: 'string', description: 'desktop + mobile' },
      },
    },
    roadmap: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['phase', 'goal', 'modules', 'effort', 'rationale'],
        properties: {
          phase: { type: 'string' }, goal: { type: 'string' },
          modules: { type: 'array', items: { type: 'string' } },
          effort: { type: 'string' }, rationale: { type: 'string' },
        },
      },
    },
    mvp: {
      type: 'object', additionalProperties: false,
      required: ['what', 'why', 'firstFeatures'],
      properties: { what: { type: 'string' }, why: { type: 'string' }, firstFeatures: { type: 'array', items: { type: 'string' } } },
    },
    privacy: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['risk', 'severity', 'mitigation'], properties: { risk: { type: 'string' }, severity: { type: 'string' }, mitigation: { type: 'string' } } } },
    openDecisions: { type: 'array', items: { type: 'string' }, description: 'quyết định Minh cần chốt' },
  },
}

const proposal = await agent(
  `Bạn là Chief Product Officer kiêm Chief Architect cho justlife. Tổng hợp 6 phân tích dưới thành 1 PHƯƠNG ÁN BUILD mạch lạc, ưu tiên ship nhỏ (R-JL-SHIP-SMALL) + chống bloat. Bắt buộc:
- Hiệu chỉnh PILLARS theo brief mới (rộng hơn 4 trụ cũ).
- modules: gộp feature thành module rõ ràng, đánh dấu multiUser=true cho module có học viên.
- architecture: GIẢI QUYẾT mâu thuẫn single-user (R-JL-SINGLE-USER-01) vs multi-user (dạy học). Đề xuất stack 1-codebase responsive desktop+mobile, auth+role, DB hosted, tách personal vs shared.
- roadmap: chia phase, MVP nhỏ TRƯỚC. MVP nên đánh đúng pain lớn nhất (trễ deadline xuyên 3 vai → quản lý việc + capture + time-block). Module dạy học multi-user để phase sau (nặng + nhạy cảm privacy).
- privacy: nhấn dữ liệu học viên (PII, có thể minor).
- openDecisions: liệt kê điều Minh phải chốt (vd: bật multi-user dạy học ngay hay sau; có host cloud không; stack).
visionSummary song ngữ kỹ thuật + bình dân. KHÔNG bịa, chỉ dùng dữ liệu dưới.

${analyses.map(a => `### ${a.domain}\n${a.summary}\nJTBD: ${(a.jobsToBeDone||[]).join('; ')}\nPains: ${(a.painPoints||[]).join('; ')}\nMust-have: ${(a.mustHaveFeatures||[]).map(f=>`[${f.priority}] ${f.feature} (${f.pillar})`).join('; ')}\nData hints: ${(a.dataModelHints||[]).join('; ')}\nRisks: ${(a.risks||[]).join('; ')}`).join('\n\n')}

Theo schema, đầy đủ mọi field.`,
  { label: 'synthesize:proposal', phase: 'Synthesize', schema: SYNTH_SCHEMA }
)

return { proposal, analyses, hint: 'Caller (main) trình phương án cho Minh: visionSummary + modules + architecture (multi-user) + roadmap + mvp + openDecisions. Sau khi Minh chốt → knowledge-keeper cập nhật product-vision.md + rules (multi-user), architect ra ADR-001 stack.' }
