// Khung chờ khi chuyển màn trong khu cá nhân (SPEC-Perf-P1 T10): hiện ngay trong layout
// qua Suspense của route segment, thay cho màn trắng khi dữ liệu đang tải.

export default function AppLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải…</span>
      <div className="app-skel-head">
        <div className="skel app-skel-title" />
        <div className="skel app-skel-line" />
      </div>
      <div className="skel app-skel-sec" />
      <div className="app-skel-stack">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skel app-skel-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
