// Dùng chung cho các primitive Base UI (ADR-005 3c): Base UI cho phép className là hàm theo state;
// các wrapper của justlife chỉ nhận chuỗi để ghép với cn().
export type WithClassName<P> = Omit<P, "className"> & { className?: string };

// Nút X của Dialog / Sheet: vùng chạm 44px trên điện thoại, 32px trên web.
export const OVERLAY_CLOSE_CLASS =
  "focus-visible:ring-ring/50 absolute top-2 right-2 grid size-11 place-items-center rounded-md opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:pointer-events-none md:top-3 md:right-3 md:size-8";
