interface UnsupportedQuestionViewProps {
  title?: string;
}

export function UnsupportedQuestionView({
  title = 'Denne oppgavetypen støttes ikke lenger',
}: UnsupportedQuestionViewProps) {
  return (
    <div className="rounded-2xl border-2 border-amber-300/80 bg-amber-50 px-5 py-6 text-center space-y-2">
      <p className="text-lg font-bold text-amber-950">{title}</p>
      <p className="text-sm text-amber-900 leading-relaxed">
        Gruizmaster kan slette oppgaven og legge til en ny type spill. Eksisterende lagrede quizzer
        kan fortsatt åpnes uten at appen krasjer.
      </p>
    </div>
  );
}
