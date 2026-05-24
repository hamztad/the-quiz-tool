import { useState } from 'react';
import { CLIENT_EVENTS, type Protest, type PublicRoomState } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { PageShell } from '../layout/PageShell';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useSocket } from '../../hooks/useSocket';
import { getQuestionFasitText } from '../../lib/hostAnswerKey';
import { formatTeamAnswerDisplay } from '../../lib/teamAnswerDisplay';
import { getTeamQuestionScore, scoreSourceLabel } from '../../lib/teamScoreDisplay';

interface TeamResultsReviewViewProps {
  room: PublicRoomState;
  teamId: string;
  teamName: string;
  onBack?: () => void;
  backLabel?: string;
}

function protestStatusLabel(status: Protest['status']): string {
  switch (status) {
    case 'pending':
      return 'Venter på quizmaster';
    case 'approved':
      return 'Godkjent';
    case 'rejected':
      return 'Avvist';
  }
}

function protestBadgeVariant(status: Protest['status']): 'open' | 'submitted' | 'locked' {
  switch (status) {
    case 'pending':
      return 'open';
    case 'approved':
      return 'submitted';
    case 'rejected':
      return 'locked';
  }
}

export function TeamResultsReviewView({
  room,
  teamId,
  teamName,
  onBack,
  backLabel = 'Tilbake',
}: TeamResultsReviewViewProps) {
  const { socket } = useSocket();
  const [protestDrafts, setProtestDrafts] = useState<Record<string, string>>({});
  const [openProtestId, setOpenProtestId] = useState<string | null>(null);

  const submitProtest = (questionId: string) => {
    socket.emit(CLIENT_EVENTS.PROTEST_SUBMIT, {
      questionId,
      message: protestDrafts[questionId]?.trim() || undefined,
    });
    setProtestDrafts((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setOpenProtestId(null);
  };

  const answeredQuestions = room.questions.filter((q) =>
    (room.answeredByTeam[teamId] ?? []).includes(q.id),
  );

  return (
    <PageShell title={teamName} subtitle="Egne svar og poeng">
      {onBack && (
        <div className="mb-4">
          <Button type="button" variant="secondary" size="sm" onClick={onBack}>
            ← {backLabel}
          </Button>
        </div>
      )}

      <p className="text-sm text-quiz-muted mb-5 leading-relaxed">
        Se hvordan svarene dine ble vurdert. Du kan sende protest til quizmaster hvis du mener
        poengene er feil.
      </p>

      {answeredQuestions.length === 0 ? (
        <Card className="p-5 text-center">
          <p className="text-sm text-quiz-muted">Ingen besvarte spørsmål ennå.</p>
        </Card>
      ) : (
        <div className="quiz-page-content space-y-5 pb-6">
          {answeredQuestions.map((question, index) => {
            const answer = room.answers.find(
              (a) => a.teamId === teamId && a.questionId === question.id,
            );
            const answerText = formatTeamAnswerDisplay(question, answer?.value);
            const fasit = getQuestionFasitText(question);
            const score = getTeamQuestionScore(room, teamId, question.id);
            const graderTeam = score.graderTeamId
              ? room.teams.find((t) => t.id === score.graderTeamId)
              : undefined;
            const protest = room.protests.find(
              (p) => p.teamId === teamId && p.questionId === question.id,
            );
            const showProtestForm = openProtestId === question.id;

            return (
              <Card key={question.id} className="space-y-4 p-4 sm:p-5 min-w-0 max-w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-quiz-muted">
                    Spørsmål {index + 1}
                  </span>
                  <Badge variant={question.type === 'mc' ? 'open' : 'submitted'}>
                    {question.type === 'mc' ? 'Flervalg' : 'Åpent'}
                  </Badge>
                  {protest && (
                    <Badge variant={protestBadgeVariant(protest.status)}>
                      {protestStatusLabel(protest.status)}
                    </Badge>
                  )}
                </div>

                <QuestionBody question={question} showHint={false} />

                <section className="rounded-xl border border-quiz-border/80 bg-quiz-bg/40 overflow-hidden min-w-0">
                  <div className="border-b border-quiz-border/80 px-3 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
                      Ditt svar
                    </h3>
                  </div>
                  <p className="px-3 py-3 text-base font-medium text-quiz-text quiz-user-text break-words [overflow-wrap:anywhere]">
                    {answerText ?? '—'}
                  </p>
                </section>

                <section className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden min-w-0">
                  <div className="border-b border-green-500/20 px-3 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-green-400">
                      Fasit
                    </h3>
                  </div>
                  <p className="px-3 py-3 text-sm font-medium text-quiz-text quiz-user-text break-words [overflow-wrap:anywhere]">
                    {fasit ?? '—'}
                  </p>
                </section>

                <section className="rounded-xl border border-quiz-border/80 bg-quiz-surface-elevated/40 px-3 py-3 min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted mb-1">
                    Poeng gitt
                  </h3>
                  {score.points !== null ? (
                    <p className="text-base font-semibold text-quiz-text">
                      {score.points}/{question.maxPoints} poeng
                      <span className="text-sm font-normal text-quiz-muted">
                        {' '}
                        · {scoreSourceLabel(score.source)}
                        {graderTeam ? ` · rettet av ${graderTeam.name}` : ''}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-quiz-muted">Ikke poengsatt ennå</p>
                  )}
                </section>

                {protest?.message && (
                  <p className="text-xs text-quiz-muted break-words [overflow-wrap:anywhere]">
                    Din protest: {protest.message}
                  </p>
                )}

                {!protest && score.points !== null && (
                  <>
                    {showProtestForm ? (
                      <div className="space-y-2 rounded-xl border border-quiz-border/60 bg-quiz-surface/40 p-3">
                        <TextArea
                          placeholder="Valgfri melding til quizmaster…"
                          value={protestDrafts[question.id] ?? ''}
                          onChange={(e) =>
                            setProtestDrafts((prev) => ({
                              ...prev,
                              [question.id]: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => submitProtest(question.id)}>
                            Send protest
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setOpenProtestId(null)}
                          >
                            Avbryt
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setOpenProtestId(question.id)}
                      >
                        Protester
                      </Button>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
