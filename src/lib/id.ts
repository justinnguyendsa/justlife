// ID ngắn ổn định cho entity. randomUUID có sẵn ở Node 19+ và trình duyệt hiện đại.
export function genId(): string {
  return crypto.randomUUID();
}

// ID ngắn cho share link (URL gọn).
export function genShortId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}
