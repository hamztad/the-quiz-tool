import type { ReactNode, MouseEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ImageSearchModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

function handleCloseClick(event: MouseEvent, onClose: () => void) {
  event.preventDefault();
  event.stopPropagation();
  onClose();
}

export function ImageSearchModal({ open, onClose, title, children }: ImageSearchModalProps) {
  const titleId = 'image-search-modal-title';

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnBackdropClick
      labelledBy={titleId}
      maxWidthClass="max-w-lg"
      panelClassName="flex max-h-[min(90dvh,900px)] flex-col overflow-hidden p-0"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-quiz-border px-4 py-3 sm:px-5">
        <h2
          id={titleId}
          className="min-w-0 flex-1 text-base font-bold text-quiz-text break-words [overflow-wrap:anywhere]"
        >
          {title}
        </h2>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-quiz-border bg-quiz-bg text-2xl font-bold leading-none text-quiz-muted transition-colors hover:border-quiz-accent/50 hover:bg-quiz-accent/10 hover:text-quiz-text"
          aria-label="Lukk bildesøk"
          onClick={(event) => handleCloseClick(event, onClose)}
        >
          <span aria-hidden>×</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {children}
      </div>
      <div className="shrink-0 border-t border-quiz-border px-4 py-3 sm:px-5 sm:hidden">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={(event) => handleCloseClick(event, onClose)}
        >
          Lukk
        </Button>
      </div>
    </Modal>
  );
}
