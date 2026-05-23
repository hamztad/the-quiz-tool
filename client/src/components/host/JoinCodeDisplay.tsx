import { QRCodeSVG } from 'qrcode.react';

interface JoinCodeDisplayProps {
  joinCode: string;
  joinUrl: string;
}

export function JoinCodeDisplay({ joinCode, joinUrl }: JoinCodeDisplayProps) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-4 sm:p-6">
      <div className="flex flex-col items-center gap-4 w-full min-w-0">
        <div className="w-full max-w-[10rem] sm:max-w-[11rem] flex justify-center">
          <QRCodeSVG
            value={joinUrl}
            size={160}
            bgColor="#242d3a"
            fgColor="#f0f4f8"
            className="h-auto w-full max-w-full"
          />
        </div>
        <div className="w-full min-w-0 text-center">
          <p className="text-sm text-quiz-muted mb-1">Romkode for lag</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-wide text-quiz-accent break-words [overflow-wrap:anywhere] px-1">
            {joinCode}
          </p>
          <p className="text-xs text-quiz-muted mt-2">Skann QR — åpner deltakerportalen</p>
        </div>
        <p className="w-full min-w-0 text-xs text-quiz-muted text-center break-all [overflow-wrap:anywhere] px-1">
          {joinUrl}
        </p>
      </div>
    </div>
  );
}
