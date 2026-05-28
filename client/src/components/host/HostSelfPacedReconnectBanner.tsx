interface HostSelfPacedReconnectBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function HostSelfPacedReconnectBanner({
  visible,
  onDismiss,
}: HostSelfPacedReconnectBannerProps) {
  if (!visible) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-900"
      role="status"
    >
      <span>Du er koblet tilbake til den selvgående quizen.</span>
      <button
        type="button"
        onClick={onDismiss}
        className="font-medium text-green-900 underline hover:no-underline"
      >
        OK
      </button>
    </div>
  );
}
