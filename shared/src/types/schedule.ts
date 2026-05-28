export type QuizRunMode = 'manual' | 'assisted' | 'automatic';

export type QuizDeliveryMode = 'qm_led' | 'self_paced' | 'interval';

export interface QuestionIntervalWindow {
  questionId: string;
  opensAt: number;
  closesAt: number;
}

export interface QuizSchedule {
  enabled: boolean;
  /** qm_led = QM åpner/lukker. self_paced = alle oppgaver. interval = tidsvindu per oppgave. */
  deliveryMode?: QuizDeliveryMode;
  /** Intervall: når hver oppgave åpnes og lukkes innen quiz-vinduet. */
  intervalWindows?: QuestionIntervalWindow[];
  /** Monotonic id — incremented on each arm to ignore stale coordinator callbacks */
  generation?: number;
  armedAt?: number;
  startsAt?: number;
  endsAt?: number;
  startDelayMs?: number;
  durationMs?: number;
  autoOpenFirstQuestion?: boolean;
  runMode: QuizRunMode;
  completedAt?: number;
}

export interface QuestionTimerConfig {
  mode: 'none' | 'preset' | 'custom';
  preset?: '10s' | '30s' | '1m' | '5m';
  customMs?: number;
}

export interface ActiveQuestionTimer {
  questionId: string;
  openedAt: number;
  endsAt: number;
  generation: number;
  durationMs: number;
}
