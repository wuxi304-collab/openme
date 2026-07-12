import React, { useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import './ConfirmDialog.css';

export type ConfirmVariant = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export interface ConfirmDialogState extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

interface Props {
  state: ConfirmDialogState | null;
  onResolve: (ok: boolean) => void;
}

export default function ConfirmDialog({ state, onResolve }: Props) {
  const { t } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const close = useCallback((ok: boolean) => { if (state) onResolve(ok); }, [state, onResolve]);

  // Capture the trigger element on open so we can restore focus on close.
  useEffect(() => {
    if (!state) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
  }, [state]);

  // ESC cancels. Enter triggers the focused button (browser default for buttons).
  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  // Focus trap: cycle Tab / Shift+Tab within the dialog card so keyboard
  // users cannot escape into the page background. Mirrors Settings / About.
  useEffect(() => {
    if (!state) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const card = cardRef.current;
      if (!card) return;
      const focusable = card.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const focusableArr = Array.from(focusable);
      const first = focusableArr[0]!;
      const last = focusableArr[focusableArr.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !card.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !card.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  // Focus the cancel button when the dialog opens. Cancel-first ordering is
  // safer: a stray Enter or space must not destroy user work.
  useEffect(() => {
    if (state) {
      requestAnimationFrame(() => { cancelRef.current?.focus(); });
    }
  }, [state]);

  // Restore focus to the trigger element once the dialog has unmounted.
  useEffect(() => {
    if (state) return;
    const target = previouslyFocusedRef.current;
    if (!target || typeof target.focus !== 'function') return;
    const handle = window.setTimeout(() => {
      if (document.body.contains(target)) target.focus();
      previouslyFocusedRef.current = null;
    }, 0);
    return () => window.clearTimeout(handle);
  }, [state]);

  // Mouse-down check so the user can drag-select text inside the message and
  // release on the overlay without dismissing the dialog mid-gesture.
  const handleOverlayMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) close(false);
  }, [close]);

  if (!state) return null;

  const variant = state.variant ?? 'default';
  const cancelLabel = state.cancelLabel ?? t('confirmCancel');
  const confirmLabel = state.confirmLabel ?? t('confirmOk');

  return (
    <div
      ref={overlayRef}
      className='confirm-dialog-overlay'
      role="dialog"
      aria-modal="true"
      aria-labelledby='confirm-dialog-title'
      aria-describedby='confirm-dialog-message'
      onMouseDown={handleOverlayMouseDown}
    >
      <div ref={cardRef} className="confirm-dialog-card" tabIndex={-1}>
        <header className='confirm-dialog-header'>
          <h2 id='confirm-dialog-title' className='confirm-dialog-title'>{state.title}</h2>
        </header>
        <div className='confirm-dialog-body'>
          <p id='confirm-dialog-message' className='confirm-dialog-message'>{state.message}</p>
        </div>
        <footer className='confirm-dialog-footer'>
          <button
            ref={cancelRef}
            type='button'
            className='confirm-dialog-cancel'
                    onClick={() => close(false)}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type='button'
                    className={`confirm-dialog-confirm is-${variant}`}
                    onClick={() => close(true)}
                  >
                    {confirmLabel}
                  </button>
                </footer>
              </div>
            </div>
          );
        }
