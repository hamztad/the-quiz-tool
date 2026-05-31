interface HostReconnectBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function HostReconnectBanner({ visible, onDismiss }: HostReconnectBannerProps) {
  if (!visible) return null;

  return (
    <div
      className="mb-4 rounded-2xl border border-emerald-400/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="font-medium">Du er koblet tilbake til Gruizen.</p>
      <button
        type="button"
        className="text-emerald-900 font-semibold underline underline-offset-2 shrink-0"
        onClick={onDismiss}
      >
        Lukk
      </button>
    </div>
  );
}
