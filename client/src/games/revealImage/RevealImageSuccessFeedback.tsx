interface RevealImageSuccessFeedbackProps {
  className?: string;
}

export function RevealImageSuccessFeedback({ className = '' }: RevealImageSuccessFeedbackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`reveal-image-success rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50/80 px-4 py-3.5 text-center shadow-md shadow-emerald-200/35 ${className}`.trim()}
    >
      <p className="text-lg font-extrabold tracking-tight text-emerald-950 sm:text-xl">
        <span aria-hidden className="mr-1.5">
          ✅
        </span>
        Du fant motivet!
      </p>
    </div>
  );
}
