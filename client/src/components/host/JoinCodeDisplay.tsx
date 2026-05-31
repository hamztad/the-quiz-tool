import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GruizMark } from '../brand/GruizMark';

interface JoinCodeDisplayProps {
  joinCode: string;
  joinUrl: string;
}

const QR_SIZE = 256;
const QR_LOGO_WIDTH = 100;
const QR_LOGO_HEIGHT = 34;
const QR_BG = '#242d3a';
const QR_FG = '#f0f4f8';

export function JoinCodeDisplay({ joinCode, joinUrl }: JoinCodeDisplayProps) {
  const [showUrl, setShowUrl] = useState(false);

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-4 sm:p-6">
      <div className="flex flex-col w-full min-w-0">
        <section
          className="flex flex-col items-center rounded-xl border border-quiz-border/70 bg-quiz-bg/70 px-5 py-8 sm:py-10"
          aria-label="QR-kode for spillere"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-quiz-muted mb-5">
            Skann for å bli med
          </p>
          <div className="rounded-2xl bg-[#242d3a] p-5 shadow-inner">
            <QRCodeSVG
              value={joinUrl}
              size={QR_SIZE}
              bgColor={QR_BG}
              fgColor={QR_FG}
              level="H"
              marginSize={2}
              className="block h-auto w-full max-w-full rounded-xl"
              imageSettings={{
                src: `${import.meta.env.BASE_URL}gruiz-qr-center.svg`,
                width: QR_LOGO_WIDTH,
                height: QR_LOGO_HEIGHT,
                excavate: true,
              }}
            />
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
          <p className="text-sm text-quiz-muted mb-2">Romkode for spillere</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-wide text-quiz-accent break-words [overflow-wrap:anywhere] px-1">
            {joinCode}
          </p>
          <p className="text-xs text-quiz-muted mt-3">Skriv inn på spillerportalen hvis dere ikke bruker QR</p>
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
