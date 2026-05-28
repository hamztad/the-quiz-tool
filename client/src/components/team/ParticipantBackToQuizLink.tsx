import { PARTICIPANT_BACK_TO_QUIZ_LABEL } from '../../lib/teamQuestionListNav';

interface ParticipantBackToQuizLinkProps {
  onClick: () => void;
  className?: string;
}

export function ParticipantBackToQuizLink({ onClick, className = '' }: ParticipantBackToQuizLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-1 py-2 text-left text-base font-semibold text-violet-800 underline-offset-4 transition-colors hover:bg-violet-50 hover:text-violet-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${className}`.trim()}
    >
      <span className="text-lg leading-none" aria-hidden>
        ←
      </span>
      <span>{PARTICIPANT_BACK_TO_QUIZ_LABEL}</span>
    </button>
  );
}
