import { createContext } from "react";

export type ToastMsg = { id: number; text: string; kind?: "info"|"success"|"error" };
export type ToastApi = { toast: (m: Omit<ToastMsg, "id">) => void };

export const ToastCtx = createContext<ToastApi | null>(null);