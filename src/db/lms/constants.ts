// Hằng số dùng chung cho seed/demo LMS (KHÔNG side-effect — an toàn để import từ nhiều nơi).
// classId cố định để giữ liên kết demo lib_file.linkClassId (personal.db) ↔ tc_class (lms.db) — soft link, no FK chéo.
export const DEMO_CLASS_ID = "demo-da01-class";
