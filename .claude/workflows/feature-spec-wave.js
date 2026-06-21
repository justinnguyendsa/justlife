export const meta = {
  name: 'justlife-feature-spec-wave',
  description: 'Wave viết spec cho 1 feature justlife: user-story → (tech-spec ∥ uiux-spec) → spec-conformance (mode SPEC). Mỗi agent GHI FILE vào .agents/specs/. Tái dùng cho mọi feature qua args:{feature, scope}.',
  whenToUse: 'Sau khi R&D/quyết định xong, cần viết bộ spec (US + Tech + UIUX) trước khi code. Pass args:{feature, scope}.',
  phases: [
    { title: 'Spec', detail: 'user-story trước → tech-spec + uiux-spec song song' },
    { title: 'Verify', detail: 'spec-conformance kiểm US/AC được spec phủ đủ' },
  ],
}

const feature = (args && args.feature) || 'Feature'
const scope = (args && args.scope) || 'Xem .agents/specs/rd/ cho phạm vi.'
const DATE = (args && args.date) || 'DDMMYYYY'

phase('Spec')

const us = await agent(
  `Bạn là user-story-writer justlife. Viết User Stories cho feature "${feature}".

PHẠM VI & NGỮ CẢNH:
${scope}

YÊU CẦU:
- Đọc .agents/context/product-vision.md + design-system.md để bám 6 trụ + persona Minh.
- Viết US cho TỪNG module trong phạm vi, mỗi US đủ 6 phần: Story (As a/I want/So that) · Acceptance Criteria (Given/When/Then, đo được) · UAT Test Steps (người thường test được) · Priority (P0/P1/P2) · Out of Scope · Edge cases (BẮT BUỘC nghĩ: múi giờ, lịch cố định trùng, offline, empty).
- GHI FILE: .agents/specs/user-stories/US-${feature}-${DATE}.md
- Trả về: đường dẫn file + danh sách AC (id + 1 dòng) để các agent sau truy vết.`,
  { label: 'user-story', phase: 'Spec', agentType: 'user-story-writer' }
)

const [tech, uiux] = await parallel([
  () => agent(
    `Bạn là tech-spec-writer justlife. Viết Tech Spec cho "${feature}".

ĐỌC TRƯỚC: .agents/context/tech-stack.md (ĐÃ CHỐT: Next.js 15 + TS + Drizzle + SQLite/libSQL local-first, Server Actions, route group (personal), Vercel), ADR-001, và US vừa viết tại .agents/specs/user-stories/US-${feature}-${DATE}.md.

PHẠM VI:
${scope}

YÊU CẦU:
- Data/Schema: định nghĩa bảng trong personal.db (Drizzle schema) cho các entity của feature. Migration là task riêng, trước task đọc nó.
- API/Boundary: Server Actions / Route Handlers dưới /api/personal/* — input/output/lỗi.
- Bảng task T01..: mỗi task có owner agent (backend-builder/frontend-builder/data-analyst), file dự kiến, depends, reuse, effort. Cho phép Wave 3 build song song (file disjoint).
- Đánh dấu field nhạy cảm → privacy-auditor (sức khỏe/cảm xúc nếu có).
- Test plan cho qa-verifier (typecheck/build/edge/error).
- GHI FILE: .agents/specs/tech-specs/SPEC-${feature}-${DATE}.md. Trả về đường dẫn + số task + bảng nào.`,
    { label: 'tech-spec', phase: 'Spec', agentType: 'tech-spec-writer' }
  ),
  () => agent(
    `Bạn là uiux-spec-writer justlife. Viết UIUX Spec cho "${feature}".

ĐỌC TRƯỚC: .agents/context/design-system.md (BẮT BUỘC: Cobalt&Amber, Be Vietnam Pro/Inter/Geist Mono, lucide, NO gradient, tokens.css), US tại .agents/specs/user-stories/US-${feature}-${DATE}.md.

PHẠM VI:
${scope}

YÊU CẦU:
- Mobile-first (Minh bắt việc trên điện thoại giữa khối lịch). Screen flow + từng màn: layout, component (REUSE nếu có), token màu theo trụ (work=cobalt/teach=teal/study=violet/growth=amber), states (loading/empty/error/success), tương tác, microcopy 100% TIẾNG VIỆT (không lorem).
- Accessibility: tương phản, target ≥44px, focus ring.
- Map từng AC của US → màn thể hiện.
- GHI FILE: .agents/specs/uiux-specs/UIUX-${feature}-${DATE}.md. Trả về đường dẫn + số màn + component mới cần.`,
    { label: 'uiux-spec', phase: 'Spec', agentType: 'uiux-spec-writer' }
  ),
])

phase('Verify')

const conf = await agent(
  `Bạn là spec-conformance-verifier justlife (mode SPEC). Feature "${feature}".
Đọc: US (.agents/specs/user-stories/US-${feature}-${DATE}.md), Tech Spec (.agents/specs/tech-specs/SPEC-${feature}-${DATE}.md), UIUX (.agents/specs/uiux-specs/UIUX-${feature}-${DATE}.md).
Lập ma trận US-AC → (UIUX màn? + Tech-Spec task?). Bắt AC P0 chưa được phủ = CRITICAL.
GHI FILE: .agents/specs/Conformance-${feature}-${DATE}.md.
Trả về: verdict (FULL/GAPS/CRITICAL) + danh sách gap (nếu có) + 1 câu kết luận sẵn sàng build hay chưa.`,
  { label: 'conformance', phase: 'Verify', agentType: 'spec-conformance-verifier' }
)

return {
  feature,
  files: {
    userStories: `.agents/specs/user-stories/US-${feature}-${DATE}.md`,
    techSpec: `.agents/specs/tech-specs/SPEC-${feature}-${DATE}.md`,
    uiuxSpec: `.agents/specs/uiux-specs/UIUX-${feature}-${DATE}.md`,
    conformance: `.agents/specs/Conformance-${feature}-${DATE}.md`,
  },
  summaries: { us, tech, uiux, conformance: conf },
  hint: 'Nếu conformance = FULL → chạy feature-readiness rồi /justlife-develop. Nếu GAPS/CRITICAL → bổ sung spec trước khi code.',
}
