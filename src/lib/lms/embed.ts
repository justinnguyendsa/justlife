// 🎬 Nhận diện URL video/host được PHÉP nhúng (YouTube/Vimeo/Google Drive) → trả src nhúng an toàn.
// Bảo mật: whitelist host (chống nhúng host lạ / clickjacking), chỉ lấy id bằng regex chặt,
// chỉ chấp nhận http/https. Trả null nếu không nhúng được → UI hiển thị link "Mở" thay vì iframe.
//
// 🗣️ Bình dân: nếu là link YouTube/Vimeo/Drive thì cho xem ngay trong trang; link khác thì mở tab mới.

export type Embed = { kind: "youtube" | "vimeo" | "drive"; src: string };

const ID = /^[A-Za-z0-9_-]+$/; // id YouTube/Drive an toàn

export function getEmbed(rawUrl: string | null | undefined): Embed | null {
  if (!rawUrl) return null;
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      if (v && ID.test(v)) return { kind: "youtube", src: `https://www.youtube.com/embed/${v}` };
    }
    const m = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)$/);
    if (m) return { kind: "youtube", src: `https://www.youtube.com/embed/${m[1]}` };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (id && ID.test(id)) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id && /^[0-9]+$/.test(id)) return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` };
  }
  if (host === "player.vimeo.com") {
    const m = u.pathname.match(/^\/video\/([0-9]+)$/);
    if (m) return { kind: "vimeo", src: `https://player.vimeo.com/video/${m[1]}` };
  }

  // Google Drive (preview)
  if (host === "drive.google.com") {
    const m = u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m) return { kind: "drive", src: `https://drive.google.com/file/d/${m[1]}/preview` };
  }

  return null;
}
