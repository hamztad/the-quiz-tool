# Timed quizzes

## Modes

- **Manual** (default): Quizmaster opens and locks questions. Optional per-question timers auto-lock when a question is open.
- **Assisted schedule**: Relative start delay and optional quiz duration. Server starts the quiz at `startsAt`, can auto-open the first question, and ends the quiz at `endsAt` (locks all questions, shows leaderboard).
- **Automatic** (reserved): Full question sequencing is not implemented yet.

## Server authority

Clients display countdowns from `endsAt` timestamps in `ROOM_STATE`. Submissions after lock are rejected. `serverNow` on each state update helps correct display skew.

## Host actions

- **Planlegg tid** (present/lobby): `quiz:schedule:set` / `quiz:schedule:cancel`
- **Tving åpne**: `question:force-reopen` after quiz end (`teamsLockedOut`)

## Quiz file

Export version 2 includes optional `question.timer`. Version 1 files import unchanged.
