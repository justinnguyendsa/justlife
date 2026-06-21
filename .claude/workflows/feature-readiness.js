export const meta = {
  name: 'justlife-feature-readiness',
  description: 'Kiểm tra một feature justlife ĐÃ SẴN SÀNG để build chưa, trước khi /justlife-develop. Fan-out song song 4 góc (spec-conformance · privacy-by-design · reuse map · scope/bloat) → verdict GO / NO-GO. Read-only.',
  whenToUse: 'Sau /justlife-feature-spec, trước /justlife-develop. Pass args:{feature:"<tên feature>"} để tìm đúng US/Tech/UIUX spec.',
  phases: [
    { title: 'Check', detail: '4 agent kiểm song song' },
    { title: 'Verdict', detail: 'tổng hợp GO / NO-GO + việc thiếu' },
  ],
}

const feature = (args && args.feature) || ''
if (!feature) log('⚠️ Chưa truyền args.feature — agent sẽ tự tìm spec mới nhất trong .agents/specs/.')

const CHECK_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['angle', 'pass', 'summary', 'blockers'],
  properties: {
    angle: { type: 'string' },
    pass: { type: 'boolean' },
    summary: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' }, description: 'việc phải bổ sung trước khi build' },
  },
}

phase('Check')

const fLabel = feature || 'feature mới nhất'
const angles = [
  { key: 'conformance', label: 'check:conformance', prompt: `spec-conformance-verifier justlife (mode SPEC). Feature: "${fLabel}". Đọc US (.agents/specs/user-stories), Tech Spec (.agents/specs/tech-specs), UIUX Spec (.agents/specs/uiux-specs) liên quan. Lập ma trận US-AC → UIUX/Tech-Spec phủ đủ chưa. pass=true nếu mọi AC P0 được phủ trong spec. blockers = AC chưa phủ. angle="conformance". Theo schema.` },
  { key: 'privacy', label: 'check:privacy', prompt: `privacy-auditor justlife (review thiết kế, chưa có code). Feature: "${fLabel}". Đọc Tech Spec + ADR/data-model. Kiểm privacy-by-design: data model chỉ lưu field cần thiết? field nhạy cảm (sức khỏe/cảm xúc/vị trí) đã cờ + có hướng xử lý? có 3rd-party giữ dữ liệu chưa được duyệt? pass=true nếu thiết kế đạt P5. blockers = thiếu sót privacy. angle="privacy". Theo schema.` },
  { key: 'reuse', label: 'check:reuse', prompt: `codebase-cartographer justlife. Feature: "${fLabel}". Đọc tech-stack.md + quét src. Spec có tận dụng component/util có sẵn không, hay định tạo trùng? pass=true nếu reuse map rõ và không trùng lặp đáng kể. blockers = chỗ nên reuse mà spec định create-new. angle="reuse". Theo schema. (greenfield trống → pass=true, blockers rỗng).` },
  { key: 'scope', label: 'check:scope', prompt: `pm-worker justlife gác bloat. Feature: "${fLabel}". Đọc product-vision.md (4 trụ + R-JL-NO-BLOAT, R-JL-SHIP-SMALL). Feature có phục vụ rõ 1 trong 4 trụ? Scope có phải MVP nhỏ dùng được, hay đang ôm đồm? pass=true nếu gắn 1 trụ + scope là MVP hợp lý. blockers = phần nên cắt/đẩy parking lot. angle="scope". Theo schema.` },
]

const checks = (await parallel(angles.map((a) => () => agent(
  a.prompt, { label: a.label, phase: 'Check', schema: CHECK_SCHEMA, agentType: 'Explore' }
)))).filter(Boolean)

const allPass = checks.length === angles.length && checks.every((c) => c.pass)
log(`Check: ${checks.filter(c => c.pass).length}/${checks.length} góc PASS`)

phase('Verdict')

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['verdict', 'rationale', 'mustFixBeforeBuild'],
  properties: {
    verdict: { type: 'string', description: 'GO | NO-GO' },
    rationale: { type: 'string', description: 'song ngữ kỹ thuật + bình dân' },
    mustFixBeforeBuild: { type: 'array', items: { type: 'string' } },
  },
}

const verdict = await agent(
  `Tech lead justlife. Quyết định GO/NO-GO cho build "${fLabel}" dựa 4 góc kiểm dưới. NO-GO nếu bất kỳ góc nào fail với blocker thực sự. Gộp mọi blocker thành mustFixBeforeBuild. rationale song ngữ.\n\n${checks.map(c => `### ${c.angle} — ${c.pass ? 'PASS' : 'FAIL'}\n${c.summary}\nBlockers: ${(c.blockers || []).join('; ') || 'none'}`).join('\n\n')}\n\nGợi ý: allPass=${allPass}. Theo schema.`,
  { label: 'verdict', phase: 'Verdict', schema: VERDICT_SCHEMA }
)

return { verdict: verdict.verdict, detail: verdict, checks, hint: verdict.verdict === 'GO' ? 'Sẵn sàng → chạy /justlife-develop.' : 'Bổ sung mustFixBeforeBuild rồi chạy lại readiness.' }
