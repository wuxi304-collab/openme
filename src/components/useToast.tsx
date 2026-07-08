import React, { createContext, useContext } from "react";
import type { ToastKind } from "./Toast";

// Thin context so any descendant of the provider (e.g. SettingsDialog) can
// push toasts without prop-drilling. App owns the actual queue and the
// auto-dismiss timer, so the only thing we pass down is the push callback.

interface ToastContextValue {
  pushToast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ value, children }: { value: ToastContextValue; children: React.ReactNode }) {
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
