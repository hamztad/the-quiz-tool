import { resolveQuestionDecorEmoji, type Question } from '@quiz-tool/shared';

interface QuestionDecorDisplayProps {
  question: Pick<Question, 'type' | 'media' | 'decorEmoji'> & { game?: Question['game'] };
  size?: 'md' | 'lg';
  className?: string;
}

export function QuestionDecorDisplay({
  question,
  size = 'lg',
  className = '',
}: QuestionDecorDisplayProps) {
  const emoji = resolveQuestionDecorEmoji(question);
  if (!emoji) return null;

  const sizeClass = size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl';

  return (
    <div className={`flex justify-center py-1 ${className}`} aria-hidden>
      <span className={`${sizeClass} leading-none select-none drop-shadow-sm`}>{emoji}</span>
    </div>
  );
}
