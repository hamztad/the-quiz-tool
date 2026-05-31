import { useState, type ReactNode } from 'react';
import type { MediaAttachment } from '@quiz-tool/shared';
import { PixabayImagePicker } from '../media/PixabayImagePicker';
import { Button } from '../ui/Button';

export function EditorZoneLabel({
  children,
  tone = 'violet',
}: {
  children: ReactNode;
  tone?: 'violet' | 'emerald' | 'cyan';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-600/15 text-emerald-950 border-emerald-400/50'
      : tone === 'cyan'
        ? 'bg-cyan-600/15 text-cyan-950 border-cyan-400/50'
        : 'bg-violet-600/15 text-violet-950 border-violet-400/50';

  return (
    <p
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${toneClass}`}
    >
      {children}
    </p>
  );
}

export function WritingZoneCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-violet-300/45 bg-gradient-to-br from-violet-50/90 to-white/80 p-3 space-y-2.5 min-w-0 shadow-sm">
      {children}
    </div>
  );
}

export function AnswerZoneCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-50/80 to-white/70 p-3 space-y-2 min-w-0">
      {children}
    </div>
  );
}

type UtilityPanel = 'image' | 'emoji' | null;

interface QuestionEditorToolbarProps {
  hasImage: boolean;
  showEmoji: boolean;
  emojiPreview: string | null;
  utilityPanel: UtilityPanel;
  onToggleImage: () => void;
  onToggleEmoji: () => void;
  onOpenExtras: () => void;
}

export function QuestionEditorToolbar({
  hasImage,
  showEmoji,
  emojiPreview,
  utilityPanel,
  onToggleImage,
  onToggleEmoji,
  onOpenExtras,
}: QuestionEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5">
      <button
        type="button"
        onClick={onToggleImage}
        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-colors ${
          utilityPanel === 'image'
            ? 'border-sky-500 bg-sky-100 text-sky-950'
            : 'border-quiz-border/80 bg-white/90 text-quiz-text hover:border-sky-400/60'
        }`}
        aria-pressed={utilityPanel === 'image'}
      >
        <span aria-hidden>📷</span>
        Bilde
        {hasImage && (
          <span className="rounded-full bg-sky-600/15 px-1.5 py-0.5 text-[10px] text-sky-900">✓</span>
        )}
      </button>
      {showEmoji && (
        <button
          type="button"
          onClick={onToggleEmoji}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-colors ${
            utilityPanel === 'emoji'
              ? 'border-fuchsia-500 bg-fuchsia-100 text-fuchsia-950'
              : 'border-quiz-border/80 bg-white/90 text-quiz-text hover:border-fuchsia-400/60'
          }`}
          aria-pressed={utilityPanel === 'emoji'}
        >
          <span className="text-base leading-none" aria-hidden>
            {emojiPreview ?? '🙂'}
          </span>
          Emoji
        </button>
      )}
      <button
        type="button"
        onClick={onOpenExtras}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-quiz-border/80 bg-white/90 px-3 py-2 text-xs font-bold text-quiz-muted hover:border-quiz-muted hover:text-quiz-text"
      >
        <span aria-hidden>⚙️</span>
        Hint · poeng · mer
      </button>
    </div>
  );
}

export function UtilityPanelShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-sky-300/50 bg-sky-50/60 p-3 space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-sky-950">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Lukk
        </Button>
      </div>
      {children}
    </div>
  );
}

export function CollapsibleEditorSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="rounded-lg border border-quiz-border/70 bg-quiz-surface/50 min-w-0 overflow-hidden group"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-quiz-muted hover:text-quiz-text min-h-[44px] flex items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span
          className="text-quiz-muted group-open:rotate-90 transition-transform shrink-0"
          aria-hidden
        >
          ▸
        </span>
        <span className="min-w-0 break-words">{title}</span>
        {badge && (
          <span className="text-[10px] font-bold text-quiz-accent shrink-0">{badge}</span>
        )}
      </summary>
      <div className="space-y-3 px-3 pb-3 pt-0 border-t border-quiz-border/50">{children}</div>
    </details>
  );
}

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function mcOptionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

interface OptionImageAttachButtonProps {
  roomId?: string;
  label: string;
  media: MediaAttachment | undefined;
  onMediaChange: (media: MediaAttachment | undefined) => void;
}

export function OptionImageAttachButton({
  roomId,
  label,
  media,
  onMediaChange,
}: OptionImageAttachButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg transition-colors ${
          open || media
            ? 'border-sky-500 bg-sky-100/80 text-sky-950'
            : 'border-quiz-border/70 bg-quiz-surface text-quiz-muted hover:border-sky-400/50'
        }`}
        title={media ? 'Bytt bilde' : 'Legg til bilde'}
        aria-label={media ? 'Bytt bilde for alternativ' : 'Legg til bilde for alternativ'}
        aria-expanded={open}
      >
        <span aria-hidden>📷</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-sky-300/45 bg-sky-50/50 p-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-sky-900">
            {label} — bildesøk
          </p>
          <PixabayImagePicker
            roomId={roomId}
            media={media}
            onMediaChange={(next) => {
              onMediaChange(next);
              if (next) setOpen(false);
            }}
            compact
            defaultSearchExpanded={false}
            label={media ? 'Bytt bilde' : 'Søk bilde'}
            hint="Dette er bildesøk — ikke svaralternativ."
          />
        </div>
      )}
    </div>
  );
}
