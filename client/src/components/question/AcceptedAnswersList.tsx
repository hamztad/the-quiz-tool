interface AcceptedAnswersListProps {
  answers: string[];
}

export function AcceptedAnswersList({ answers }: AcceptedAnswersListProps) {
  if (!answers.length) return null;

  return (
    <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-300 mb-2">Godkjente svar</p>
      <ul className="space-y-1">
        {answers.map((a, i) => (
          <li key={i} className="text-green-100 font-medium">
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}
