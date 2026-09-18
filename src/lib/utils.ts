import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gộp className: clsx (điều kiện) + tailwind-merge (khử xung đột utility). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
