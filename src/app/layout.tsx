import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

// Con số (giờ, điểm, đếm) — font mono của preset b0.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "justlife",
  description: "Quản lý cuộc sống cá nhân — việc, lịch, deadline.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafcfe" },
    { media: "(prefers-color-scheme: dark)", color: "#0a121c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_SCRIPT,
          }}
        />
        {/* Ngữ cảnh xếp lớp riêng cho app: popup Base UI (portal vào body) luôn nổi trên nội dung (ADR-005 3c.2). */}
        <div className="isolate">{children}</div>
      </body>
    </html>
  );
}
