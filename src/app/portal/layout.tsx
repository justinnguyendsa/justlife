import "./portal.css";

// Layout GỐC segment /portal — chỉ nạp CSS khu học viên. KHÔNG chrome, KHÔNG redirect ở đây
// (để /portal/login PUBLIC không bị vòng lặp redirect). Shell + bảo vệ nằm ở (student)/layout.tsx.
// KHÔNG dùng shell/nav Personal, KHÔNG ModeSwitch.

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
