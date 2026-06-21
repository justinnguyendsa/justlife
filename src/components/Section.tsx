// Tiêu đề khu vực dùng chung (đồng bộ mọi màn). `color` truyền CSS var theo token, không hardcode.
export function Section({ color, title, cnt }: { color: string; title: string; cnt?: string }) {
  return (
    <div className="sec">
      <h2><span className="secdot" style={{ background: color }} />{title}</h2>
      {cnt && <span className="cnt">{cnt}</span>}
    </div>
  );
}
