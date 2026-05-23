import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLIENT_EVENTS, parseQuizText, type Question } from '@quiz-tool/shared';
import { QuestionBody } from '../components/question/QuestionBody';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextArea } from '../components/ui/Input';
import { useRoomState } from '../hooks/useRoomState';
import { useSocket } from '../hooks/useSocket';
import { getHostSession } from '../lib/tokens';
import { generateId } from '../lib/id';

const IMPORT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn`;

export function HostEditPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const { room } = useRoomState(socket);
  const [importText, setImportText] = useState(IMPORT_EXAMPLE);
  const [preview, setPreview] = useState<Omit<Question, 'id' | 'order'>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!roomId || !connected) return;
    const session = getHostSession(roomId);
    if (session) {
      socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, {
        roomId,
        hostToken: session.hostToken,
      });
    }
  }, [roomId, socket, connected]);

  const runPreview = () => {
    const result = parseQuizText(importText);
    setPreview(result.questions);
    setParseErrors(result.errors);
    setSaved(false);
  };

  const saveQuestions = () => {
    runPreview();
    const result = parseQuizText(importText);
    if (result.errors.length > 0) return;

    const questions: Question[] = result.questions.map((q, i) => ({
      ...q,
      id: generateId('q'),
      order: i,
    }));

    socket.emit(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, { questions });
    setSaved(true);
  };

  const addOpenQuestion = () => {
    const q: Question = {
      id: generateId('q'),
      order: (room?.questions.length ?? 0),
      type: 'open',
      lines: [{ text: 'Nytt spørsmål', style: 'title' }],
      acceptedAnswers: ['svar'],
      maxPoints: 1,
    };
    const existing = room?.questions ?? [];
    socket.emit(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, {
      questions: [...existing, q],
    });
  };

  return (
    <PageShell title="Rediger quiz" subtitle={`Rom ${room?.joinCode ?? '…'}`}>
      <div className="mb-4">
        <Link to={`/host/${roomId}`} className="text-sm text-quiz-accent hover:underline">
          ← Tilbake til dashboard
        </Link>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold mb-3">Hurtigimport</h2>
          <TextArea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" onClick={runPreview}>
              Forhåndsvis
            </Button>
            <Button onClick={saveQuestions} disabled={parseErrors.length > 0}>
              Lagre quiz
            </Button>
          </div>
          {saved && <p className="text-sm text-green-400 mt-2">Quiz lagret!</p>}
          {parseErrors.map((e, i) => (
            <p key={i} className="text-sm text-red-400 mt-1">
              {e}
            </p>
          ))}
        </Card>

        {preview.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Forhåndsvisning</h2>
            {preview.map((q, i) => (
              <Card key={i}>
                <QuestionBody question={{ ...q, id: `p${i}`, order: i }} />
                {q.acceptedAnswers && (
                  <p className="text-sm text-green-300 mt-2">
                    Svar: {q.acceptedAnswers.join(', ')}
                  </p>
                )}
                {q.options && (
                  <ul className="text-sm mt-2 space-y-1">
                    {q.options.map((o) => (
                      <li key={o.id} className={o.isCorrect ? 'text-green-300' : 'text-quiz-muted'}>
                        {o.isCorrect ? '✓ ' : ''}{o.text}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}

        <Card>
          <h2 className="font-semibold mb-3">Eksisterende ({room?.questions.length ?? 0})</h2>
          <Button variant="secondary" onClick={addOpenQuestion}>
            + Legg til åpent spørsmål
          </Button>
        </Card>
      </div>
    </PageShell>
  );
}
