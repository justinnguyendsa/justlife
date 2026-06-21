// Skeleton khi đang tải dữ liệu khu học viên (hiện trong shell qua Suspense của route segment).

export default function PortalLoading() {
  return (
    <>
      <div className="portal-hello">
        <div className="skel portal-skel-title" />
        <div className="skel portal-skel-line" />
      </div>
      <div className="sec">
        <div className="skel portal-skel-sec" />
      </div>
      <div className="stack">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skel portal-skel-card" />
          </div>
        ))}
      </div>
    </>
  );
}
