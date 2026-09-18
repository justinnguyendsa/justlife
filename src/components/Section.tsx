// Tiêu đề khu vực dùng chung (đồng bộ mọi màn). `color` truyền CSS var theo token, không hardcode.
export function Section({ color, title, cnt }: { color: string; title: string; cnt?: string }) {
  return (
    <div className="mt-5 mb-2 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[13px] font-bold">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-[3px]"
          style={{ background: color }}
        />
        {title}
      </h2>
      {cnt && <span className="text-muted-foreground font-mono text-[11px]">{cnt}</span>}
    </div>
  );
}
