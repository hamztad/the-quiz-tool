import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  children: ReactNode;
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
  /** Vertical alignment within the viewport. */
  align?: 'center' | 'bottom';
  labelledBy?: string;
  describedBy?: string;
  /** Applied to the dialog panel (not the backdrop). */
  panelClassName?: string;
  maxWidthClass?: string;
}

export function Modal({
  open,
  children,
  onClose,
  closeOnBackdropClick = false,
  align = 'center',
  labelledBy,
  describedBy,
  panelClassName = '',
  maxWidthClass = 'max-w-md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const alignClass = align === 'bottom' ? 'items-end sm:items-center' : 'items-center';

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex ${alignClass} justify-center bg-black/60 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]`}
      role="presentation"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`w-full min-w-0 ${maxWidthClass} max-h-[min(90dvh,900px)] rounded-2xl border border-quiz-border bg-quiz-surface shadow-xl ${panelClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
