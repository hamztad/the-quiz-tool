# Timed quizzes

## Modes

- **Manual** (default): Quizmaster opens and locks questions. Optional per-question timers auto-lock when a question is open.
- **Assisted schedule**: Relative delay («om litt») or wall-clock start (`datetime-local`). Optional duration or end time (max **24 hours**). Start may be planned up to **3 days** ahead. Server starts at `startsAt`, can auto-open the first question, and ends at `endsAt`.
- **Automatic** (reserved): Full question sequencing is not implemented yet.

## Server authority

Clients display countdowns from `endsAt` timestamps in `ROOM_STATE`. Submissions after lock are rejected. `serverNow` on each state update helps correct display skew.

## Host actions

- **Planlegg tid** (present/lobby): `quiz:schedule:set` with `startDelayMs` **or** `startsAt` (+ `durationMs` or `endsAt`) / `quiz:schedule:cancel`
- Per-question **Tidsur**: presets or custom up to 24 hours
- **Tving åpne**: `question:force-reopen` after quiz end (`teamsLockedOut`)

## Quiz file

Export version 2 includes optional `question.timer`. Version 1 files import unchanged.
