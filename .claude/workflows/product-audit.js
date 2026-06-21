export const meta = {
  name: 'justlife-product-audit',
  description: 'Audit sức khỏe codebase justlife song song theo 5 trục (design-system · privacy/data · dead-code/reuse · regression/date · spec-conformance) → báo cáo tổng hợp có xếp hạng severity. Read-only, không sửa code.',
  whenToUse: 'Khi cần rà soát sức khỏe dự án định kỳ (cuối sprint) hoặc trước một đợt ship lớn. Pass args:{focus?:string} để nhấn 1 trục (vd "privacy").',
  phases: [
    { title: 'Scan', detail: '5 agent Explore quét codebase song song theo 5 trục' },
    { title: 'Synthesize', detail: 'gộp findings + xếp severity + verdict' },
  ],
}

const focus = (args && args.focus) || ''

const FIND_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['dimension', 'summary', 'findings'],
  properties: {
    dimension: { type: 'string' },
    summary: { type: 'string', description: '2-4 câu trục này khỏe/yếu ra sao' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'severity', 'evidence', 'fix'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', description: 'Critical | High | Medium | Low' },
          evidence: { type: 'string', description: 'file:line + fact' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

phase('Scan')

const dims = [
  { key: 'design-system', label: 'scan:design-system', prompt: `Bạn là design-system auditor justlife. Đọc .agents/context/design-system.md rồi quét codebase tìm vi phạm: hardcode màu (#hex, rgb()), font-family hardcode, gradient (cấm), English UI copy, icon ngoài lucide. grep src --include=*.css --include=*.tsx. dimension="design-system". Theo schema, mỗi vi phạm 1 finding với file:line.` },
  { key: 'privacy', label: 'scan:privacy', prompt: `Bạn là privacy-auditor justlife. Đọc .agents/context/product-vision.md (P5) + rules R-JL-PRIVACY/LOCAL-FIRST. Quét: PII trong log (console.log/logger có email/health/mood/location), secret hardcode (api_key/token=), gửi dữ liệu ra ngoài (fetch/axios tới host không phải localhost/env), over-collection field nhạy cảm. dimension="privacy". Theo schema.` },
  { key: 'hygiene', label: 'scan:hygiene', prompt: `Bạn là code-hygiene + reuse auditor justlife. Quét: dead code (export không ai import), tính năng/component trùng lặp, util copy-paste. Loại trừ false-positive (dynamic import, convention framework, feature flag). dimension="hygiene". Theo schema, mỗi mục kèm bằng chứng đã loại false-positive.` },
  { key: 'regression', label: 'scan:regression', prompt: `Bạn là regression-detector justlife. Quét rủi ro hồi quy: import gãy, export bị xóa còn caller, chữ ký hàm đổi chưa cập nhật caller, sửa util shared dùng nhiều nơi, và ĐẶC BIỆT xử lý ngày/giờ/timezone (app lịch rất dễ sai). grep Date|timezone|setHours|toISOString. dimension="regression". Theo schema.` },
  { key: 'conformance', label: 'scan:conformance', prompt: `Bạn là spec-conformance-verifier justlife. Đọc .agents/specs/user-stories + tech-specs + uiux-specs. Lập ma trận US-AC → code phủ chưa. Tìm AC chưa có code (GAP) hoặc code không có trong spec (scope creep / bloat tiềm ẩn). dimension="conformance". Theo schema, mỗi gap 1 finding.` },
]

const found = (await parallel(dims.map((d) => () => agent(
  d.prompt + (focus && d.key.includes(focus) ? '\n\nĐÂY LÀ TRỤC FOCUS — soát kỹ và sâu hơn.' : ''),
  { label: d.label, phase: 'Scan', schema: FIND_SCHEMA, agentType: 'Explore' }
)))).filter(Boolean)

log(`Scan xong ${found.length}/${dims.length} trục. Tổng findings: ${found.reduce((n, f) => n + (f.findings ? f.findings.length : 0), 0)}`)

phase('Synthesize')

const SYNTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['verdict', 'narrative', 'topRisks', 'fixPlan'],
  properties: {
    verdict: { type: 'string', description: 'CLEAN | NEEDS-FIX | CRITICAL' },
    narrative: { type: 'string', description: '6-10 câu song ngữ kỹ thuật + bình dân (R-JL-DUAL-LANG-EXPLAIN)' },
    topRisks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['risk', 'severity'], properties: { risk: { type: 'string' }, severity: { type: 'string' } } } },
    fixPlan: { type: 'array', items: { type: 'string' }, description: 'việc cần làm, ưu tiên Critical/privacy/date trước' },
  },
}

const synthesis = await agent(
  `Bạn là tech lead justlife tổng hợp audit. Dựa findings 5 trục dưới, ra verdict tổng + narrative song ngữ + topRisks (xếp Critical→Low, ưu tiên privacy + date/timezone) + fixPlan ưu tiên. KHÔNG bịa, chỉ dùng dữ liệu dưới.\n\n${found.map(f => `### ${f.dimension}\n${f.summary}\n${(f.findings || []).map(x => `- [${x.severity}] ${x.title} — ${x.evidence} → ${x.fix}`).join('\n')}`).join('\n\n')}\n\nTheo schema.`,
  { label: 'synthesize', phase: 'Synthesize', schema: SYNTH_SCHEMA }
)

return { verdict: synthesis.verdict, synthesis, dimensions: found, hint: 'Caller lưu báo cáo vào .agents/specs/architecture/Audit-[Date].md và xử lý fixPlan theo thứ tự ưu tiên.' }
