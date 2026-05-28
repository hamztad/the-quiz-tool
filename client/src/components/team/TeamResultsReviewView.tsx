import { useState } from 'react';
import {
  CLIENT_EVENTS,
  ownAnswerQuestionIds,
  type GameSubmission,
  type Protest,
  type PublicRoomState,
  type Question,
} from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { PageShell } from '../layout/PageShell';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextArea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { OrderingComparison } from '../ordering/OrderingComparison';
import { useSocket } from '../../hooks/useSocket';
import { getQuestionFasitText } from '../../lib/hostAnswerKey';
import { formatOppgaveLabel } from '../../lib/participantCopy';
import { formatTeamAnswerDisplay } from '../../lib/teamAnswerDisplay';
import {
  getTeamQuestionScore,
  scoreSourceLabel,
} from '../../lib/teamScoreDisplay';

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

function reviewStatus(
  scorePoints: number | null,
  activeProtest: Protest | undefined,
  resolvedProtest: Protest | undefined,
  locallySubmitted: boolean,
): { label: string; variant: 'open' | 'submitted' | 'locked' | 'neutral' } {
  if (activeProtest || locallySubmitted) {
    return { label: 'Protest sendt', variant: 'open' };
  }
  if (resolvedProtest) {
    return { label: `Protest ${protestStatusLabel(resolvedProtest.status).toLowerCase()}`, variant: 'locked' };
  }
  if (scorePoints === null) {
    return { label: 'Ikke rettet ennå', variant: 'neutral' };
  }
  return { label: 'Poeng gitt', variant: 'submitted' };
}

function correctOption(question: Question) {
  return question.type === 'mc' ? question.options?.find((o) => o.isCorrect) : undefined;
}

function getReviewTeamId(room: PublicRoomState, fallbackTeamId: string): string {
  return room.viewerTeamId ?? fallbackTeamId;
}

function formatOwnGameSubmission(question: Question, submission: GameSubmission | undefined): string | null {
  if (!submission) return null;
  if (question.game?.gameId === 'anagram' && submission.payload.gameId === 'anagram') {
    return submission.payload.answer.trim() || null;
  }
  if (question.game?.gameId === 'mathExpression' && submission.payload.gameId === 'mathExpression') {
    return submission.payload.mode === 'single'
      ? submission.payload.answer.trim() || null
      : `${(submission.payload.totalMs / 1000).toFixed(2)} sekunder`;
  }
  if (question.game?.gameId === 'dropBall' && submission.payload.gameId === 'dropBall') {
    return `${submission.payload.score} poeng`;
  }
  return null;
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
  const [submittedProtestIds, setSubmittedProtestIds] = useState<Set<string>>(() => new Set());
  const reviewTeamId = getReviewTeamId(room, teamId);
  const ownAnswers = room.answers.filter((a) => a.teamId === reviewTeamId);
  const ownAnswerByQuestionId = new Map(ownAnswers.map((a) => [a.questionId, a]));
  const ownGameSubmissions = room.gameSubmissions.filter((submission) => submission.teamId === reviewTeamId);
  const latestGameSubmissionByQuestionId = new Map<string, GameSubmission>();
  for (const submission of ownGameSubmissions) {
    const current = latestGameSubmissionByQuestionId.get(submission.questionId);
    if (!current || submission.serverReceivedAt > current.serverReceivedAt) {
      latestGameSubmissionByQuestionId.set(submission.questionId, submission);
    }
  }
  const ownQuestionIds = new Set(ownAnswerQuestionIds(room.answers, reviewTeamId));
  ownGameSubmissions.forEach((submission) => ownQuestionIds.add(submission.questionId));
  room.scores
    .filter((score) => score.teamId === reviewTeamId)
    .forEach((score) => ownQuestionIds.add(score.questionId));
  const answeredQuestions = room.questions.filter((q) => ownQuestionIds.has(q.id));
  const gradedCount = answeredQuestions.filter(
    (question) => getTeamQuestionScore(room, reviewTeamId, question.id).points !== null,
  ).length;
  const totalPoints = answeredQuestions.reduce((sum, question) => {
    const score = getTeamQuestionScore(room, reviewTeamId, question.id);
    return sum + (score.points ?? 0);
  }, 0);

  const submitProtest = (questionId: string) => {
    socket.emit(CLIENT_EVENTS.PROTEST_SUBMIT, {
      questionId,
      message: protestDrafts[questionId]?.trim() || undefined,
    });
    setSubmittedProtestIds((prev) => new Set(prev).add(questionId));
    setProtestDrafts((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setOpenProtestId(null);
  };

  return (
    <PageShell showBrand="compact" title={teamName} subtitle="Egne svar og poeng">
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

      <Card className="mb-5 border-2 border-quiz-accent/50 bg-quiz-accent/10 p-4 sm:p-5">
        <p className="text-sm font-semibold text-quiz-muted">Din totalsum</p>
        <p className="mt-1 text-3xl font-black text-quiz-text tabular-nums">
          {totalPoints} poeng
        </p>
      </Card>

      {gradedCount === 0 && (
        <Card className="mb-5 border border-yellow-500/40 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-900">
            Gjennomgang er åpnet, men ingen poeng er registrert ennå.
          </p>
        </Card>
      )}

      {answeredQuestions.length === 0 ? (
        <Card className="p-5 text-center">
          <p className="text-sm text-quiz-muted">Ingen besvarte oppgaver ennå.</p>
        </Card>
      ) : (
        <div className="quiz-page-content space-y-5 pb-6">
          {answeredQuestions.map((question, index) => {
            const answer = ownAnswerByQuestionId.get(question.id);
            const gameSubmission = latestGameSubmissionByQuestionId.get(question.id);
            const answerText =
              formatOwnGameSubmission(question, gameSubmission) ??
              formatTeamAnswerDisplay(question, answer?.value);
            const fasit = getQuestionFasitText(question);
            const selectedOption =
              question.type === 'mc'
                ? question.options?.find((o) => o.id === answer?.value)
                : undefined;
            const mcCorrectOption = correctOption(question);
            const mcWasCorrect =
              question.type === 'mc' && selectedOption ? selectedOption.isCorrect : null;
            const score = getTeamQuestionScore(room, reviewTeamId, question.id);
            const graderTeam = score.graderTeamId
              ? room.teams.find((t) => t.id === score.graderTeamId)
              : undefined;
            const protests = room.protests
              .filter((p) => p.teamId === reviewTeamId && p.questionId === question.id)
              .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
            const activeProtest = protests.find((p) => p.status === 'pending');
            const resolvedProtest = protests.find((p) => p.status !== 'pending');
            const latestProtest = activeProtest ?? resolvedProtest;
            const locallySubmitted = submittedProtestIds.has(question.id);
            const status = reviewStatus(
              score.points,
              activeProtest,
              resolvedProtest,
              locallySubmitted,
            );
            const canProtest = score.points !== null && !activeProtest && !locallySubmitted;
            const showProtestForm = openProtestId === question.id && canProtest;
            const protestSnapshot = room.protests.find(
              (p) => p.teamId === reviewTeamId && p.questionId === question.id,
            );

            return (
              <Card key={question.id} className="space-y-4 p-4 sm:p-5 min-w-0 max-w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-quiz-muted">
                    {formatOppgaveLabel(index + 1)}
                  </span>
                  <Badge variant={question.type === 'mc' || question.type === 'ordering' || question.type === 'game' ? 'open' : 'submitted'}>
                    {question.type === 'mc'
                      ? 'Flervalg'
                      : question.type === 'ordering'
                        ? 'Rekkefølge'
                        : question.type === 'game'
                          ? 'Spill'
                          : 'Åpent'}
                  </Badge>
                  <Badge variant={status.variant}>{status.label}</Badge>
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
                  {question.type === 'mc' && (
                    <div className="border-t border-quiz-border/60 px-3 py-2 text-xs text-quiz-muted">
                      Valgt alternativ: {selectedOption?.text ?? '—'}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden min-w-0">
                  <div className="border-b border-green-500/20 px-3 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">
                      Fasit
                    </h3>
                  </div>
                  <p className="px-3 py-3 text-sm font-medium text-quiz-text quiz-user-text break-words [overflow-wrap:anywhere]">
                    {fasit ?? '—'}
                  </p>
                  {question.type === 'ordering' && (
                    <div className="border-t border-green-500/20 p-3">
                      <OrderingComparison question={question} submittedValue={answer?.value} />
                    </div>
                  )}
                  {question.type === 'mc' && (
                    <div className="border-t border-green-500/20 px-3 py-2 text-xs text-quiz-muted">
                      Riktig alternativ: {mcCorrectOption?.text ?? '—'}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-quiz-border/80 bg-quiz-surface-elevated/40 px-3 py-3 min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted mb-1">
                    Poeng
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
                  {question.type === 'mc' && mcWasCorrect !== null && (
                    <p className={`mt-2 text-sm ${mcWasCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {mcWasCorrect ? 'Riktig valgt' : 'Feil valgt'} · automatisk rettet
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-quiz-border/80 bg-quiz-bg/40 p-3 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
                      Protest
                    </h3>
                    {latestProtest && (
                      <Badge variant={protestBadgeVariant(latestProtest.status)}>
                        {protestStatusLabel(latestProtest.status)}
                      </Badge>
                    )}
                  </div>

                  {activeProtest || locallySubmitted ? (
                    <p className="text-sm font-medium text-yellow-900">Protest sendt</p>
                  ) : resolvedProtest ? (
                    <p className="text-sm text-quiz-muted">
                      Siste protest er {protestStatusLabel(resolvedProtest.status).toLowerCase()}.
                    </p>
                  ) : score.points === null ? (
                    <p className="text-sm text-quiz-muted">
                      Protest kan sendes når oppgaven er poengsatt.
                    </p>
                  ) : null}

                  {latestProtest?.message && (
                    <p className="mt-2 text-sm text-quiz-text break-words [overflow-wrap:anywhere]">
                      Din melding: {latestProtest.message}
                    </p>
                  )}
                  {protestSnapshot?.awardedPoints !== undefined && (
                    <p className="mt-1 text-xs text-quiz-muted">
                      Poeng da protesten ble sendt: {protestSnapshot.awardedPoints}/{question.maxPoints}
                    </p>
                  )}

                  {canProtest && (
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
                </section>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
