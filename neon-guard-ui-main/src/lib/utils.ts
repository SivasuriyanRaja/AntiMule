import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const url = import.meta.env.VITE_API_URL;
export const API_BASE_URL = url ? url.replace(/\/$/, '') : (import.meta.env.PROD ? "" : "http://localhost:8005");
