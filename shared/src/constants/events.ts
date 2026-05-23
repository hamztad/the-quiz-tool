export const CLIENT_EVENTS = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_RECONNECT: 'room:reconnect',
  QUIZ_QUESTIONS_SET: 'quiz:questions:set',
  QUIZ_START: 'quiz:start',
  QUESTION_OPEN: 'question:open',
  QUESTION_LOCK: 'question:lock',
  QUESTION_UNLOCK: 'question:unlock',
  ROUND_LOCK: 'round:lock',
  ANSWER_SUBMIT: 'answer:submit',
  ANSWER_UPDATE: 'answer:update',
  GRADING_START: 'grading:start',
  GRADING_END: 'grading:end',
  PEER_GRADE_SUBMIT: 'peerGrade:submit',
  PROTEST_SUBMIT: 'protest:submit',
  PROTEST_RESOLVE: 'protest:resolve',
  SCORE_OVERRIDE: 'score:override',
  LEADERBOARD_TOGGLE: 'leaderboard:toggle',
} as const;

export const SERVER_EVENTS = {
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_STATE: 'room:state',
  ERROR: 'error',
} as const;

export const MAX_TEAMS = 30;
export const DEFAULT_MAX_POINTS = 1;
