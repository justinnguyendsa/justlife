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
    <header className="mb-2 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <div className="text-muted-foreground mt-0.5 text-[13px]">{sub}</div>}
      </div>
      {action}
    </header>
  );
}
