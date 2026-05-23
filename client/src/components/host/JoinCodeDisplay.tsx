import { QRCodeSVG } from 'qrcode.react';

interface JoinCodeDisplayProps {
  joinCode: string;
  joinUrl: string;
}

export function JoinCodeDisplay({ joinCode, joinUrl }: JoinCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-6">
      <QRCodeSVG value={joinUrl} size={160} bgColor="#242d3a" fgColor="#f0f4f8" />
      <div className="text-center">
        <p className="text-sm text-quiz-muted mb-1">Join-kode</p>
        <p className="text-3xl font-bold tracking-[0.2em] text-quiz-accent">{joinCode}</p>
      </div>
      <p className="text-xs text-quiz-muted text-center break-all">{joinUrl}</p>
    </div>
  );
}
