import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Role, Priority } from '../types';

export interface ParsedTask {
  title: string;
  role: Role;
  priority: Priority;
  deadline: string; // YYYY-MM-DD or ''
  notes: string;
}

const SYSTEM_PROMPT = `Bạn là trợ lý quản lý công việc thông minh. Người dùng sẽ mô tả những công việc cần làm bằng tiếng Việt hoặc tiếng Anh tự nhiên.

Nhiệm vụ của bạn: Phân tích đoạn văn và tạo danh sách task có cấu trúc JSON.

Mỗi task cần có:
- title: tên công việc ngắn gọn (bắt buộc)
- role: "WORK" | "TEACH" | "MASTER" (suy luận từ ngữ cảnh: WORK=công việc/công ty, TEACH=giảng dạy/sinh viên, MASTER=nghiên cứu/luận văn/học)  
- priority: "HIGH" | "MEDIUM" | "LOW" (suy luận từ từ khóa: gấp/urgent/deadline gần = HIGH, bình thường = MEDIUM, không gấp = LOW)
- deadline: ngày YYYY-MM-DD nếu được nhắc đến, ngược lại để ""
- notes: ghi chú thêm nếu cần thiết, ngược lại để ""

Ngày hiện tại: ${new Date().toISOString().split('T')[0]}

Trả về JSON array, chỉ JSON thuần túy không có markdown fences. Ví dụ:
[{"title":"Soạn đề thi cuối kỳ","role":"TEACH","priority":"HIGH","deadline":"2026-03-25","notes":"Môn Toán ứng dụng"}]`;

export async function parseTasksWithAI(
  apiKey: string | undefined,
  userInput: string
): Promise<ParsedTask[]> {
  if (!apiKey?.trim()) throw new Error('Chưa cài đặt Gemini API Key. Vào Cài đặt → Tích hợp AI ✔ để nhập key.');

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Phân tích và tạo task từ mô tả sau:\n\n${userInput}` },
  ]);

  const text = result.response.text().trim();

  // Strip possible markdown fences
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned) as ParsedTask[];
  return parsed;
}
