import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GruizMark } from '../brand/GruizMark';

interface JoinCodeDisplayProps {
  joinCode: string;
  joinUrl: string;
}

const QR_SIZE = 224;

export function JoinCodeDisplay({ joinCode, joinUrl }: JoinCodeDisplayProps) {
  const [showUrl, setShowUrl] = useState(false);

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-4 sm:p-6">
      <div className="flex flex-col w-full min-w-0">
        <section
          className="flex flex-col items-center rounded-xl border border-quiz-border/70 bg-quiz-bg/70 px-5 py-8 sm:py-10"
          aria-label="QR-kode for deltakere"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-quiz-muted mb-5">
            Skann for å bli med
          </p>
          <div className="relative rounded-2xl bg-[#242d3a] p-5 shadow-inner">
            <QRCodeSVG
              value={joinUrl}
              size={QR_SIZE}
              bgColor="#242d3a"
              fgColor="#f0f4f8"
              level="H"
              className="block h-auto w-full max-w-full"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg border border-quiz-border/70 bg-[#242d3a]/95 px-2 py-1 shadow">
                <GruizMark size="sm" tagline={false} className="items-center [&_.gruiz-mark-dot]:hidden [&_.gruiz-mark-sparkle]:hidden" />
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-center text-xs text-quiz-muted leading-relaxed">
            Hold kameraet mot QR-koden her. Romkoden for manuell innlogging står under.
          </p>
        </section>

        <section
          className="mt-12 sm:mt-14 w-full border-t border-quiz-border/60 pt-10 sm:pt-12 text-center"
          aria-label="Romkode"
        >
          <GruizMark size="sm" tagline={false} className="mb-2 items-center [&_.gruiz-mark-dot]:hidden [&_.gruiz-mark-sparkle]:hidden" />
          <p className="text-sm text-quiz-muted mb-2">Romkode for deltakere</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-wide text-quiz-accent break-words [overflow-wrap:anywhere] px-1">
            {joinCode}
          </p>
          <p className="text-xs text-quiz-muted mt-3">Skriv inn på deltakerportalen hvis dere ikke bruker QR</p>
        </section>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrl((open) => !open)}
            className="text-xs font-medium text-quiz-accent hover:underline"
          >
            {showUrl ? 'Skjul delingslenke' : 'Vis delingslenke'}
          </button>
          {showUrl && (
            <p className="w-full min-w-0 text-xs text-quiz-muted text-center break-all [overflow-wrap:anywhere] px-1">
              {joinUrl}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
