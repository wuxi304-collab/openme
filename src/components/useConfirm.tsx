import React, { createContext, lazy, Suspense, useCallback, useContext, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { ConfirmDialogState, ConfirmOptions } from "./ConfirmDialog";

// Lazy-load the dialog itself so the provider + hook ship in the main
// bundle but the visual component is split out — matches the lazy-dialog
// pattern used by SettingsDialog and AboutDialog.
const ConfirmDialogLazy = lazy(() => import("./ConfirmDialog"));

function ConfirmDialogOrNull(props: { state: ConfirmDialogState | null; onResolve: (ok: boolean) => void }) {
  if (!props.state) return null;
  return (
    <Suspense fallback={null}>
      <ConfirmDialogLazy state={props.state} onResolve={props.onResolve} />
    </Suspense>
  );
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmDialogState | null>(null);
  const idRef = useRef(0);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      idRef.current += 1;
      setState({ ...options, id: idRef.current, resolve });
    });
  }, []);

  const handleResolve = useCallback((ok: boolean) => {
    setState((prev) => {
      if (prev) prev.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
        <ConfirmDialogOrNull state={state} onResolve={handleResolve} />
    </ConfirmContext.Provider>
  );
}

// Convenience helpers for the two confirm dialogs OpenMe currently uses.
// Centralized so App.tsx stays small and so future variants (e.g. for
// destructive operations on settings) can be added in one place.
export function useCloseTabConfirm() {
  const { t, tf } = useI18n();
  const confirm = useConfirm();
  return useCallback(
    async (name: string): Promise<boolean> => {
      return confirm({
        title: t("confirmCloseTabTitle"),
        message: tf("confirmCloseTabMessage", { name }),
        confirmLabel: t("confirmDiscard"),
        cancelLabel: t("confirmCancel"),
        variant: "danger",
      });
    },
    [confirm, t, tf]
  );
}

export function useCloseAllConfirm() {
  const { t, tf } = useI18n();
  const confirm = useConfirm();
  return useCallback(
    async (count: number): Promise<boolean> => {
      return confirm({
        title: t("confirmCloseAllTitle"),
        message: tf("confirmCloseAllMessage", { count }),
        confirmLabel: t("confirmDiscard"),
        cancelLabel: t("confirmCancel"),
        variant: "danger",
      });
    },
    [confirm, t, tf]
  );
}