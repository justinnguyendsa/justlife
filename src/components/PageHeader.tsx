// Thanh tiêu đề gọn (SPEC-UI-P2.0 T06, theo góp ý canvas "đưa heading lên, thu gọn thanh").
// Web: dính ở đầu trang, cao 56px, tên trang + dòng tóm tắt cùng một hàng, hành động bên phải.
// Điện thoại: tiêu đề lớn, tóm tắt xuống dòng dưới.
export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 mb-4 flex items-center justify-between gap-3 py-3 backdrop-blur md:sticky md:top-0 md:z-20 md:-mx-7 md:mb-6 md:h-14 md:border-b md:px-7 md:py-0">
      <div className="flex min-w-0 flex-col md:flex-row md:items-baseline md:gap-3">
        <h1 className="text-2xl leading-[30px] font-bold tracking-tight md:truncate md:text-xl md:leading-7">{title}</h1>
        {sub && <p className="text-muted-foreground text-[13px] leading-[18px] md:truncate">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
