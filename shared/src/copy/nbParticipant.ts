/** Brukerrettet norsk — «spiller» (én spiller per økt inntil lag støttes). */
export const NB = {
  participant: 'spiller',
  participants: 'spillere',
  participantName: 'spillernavn',
  participantPortal: 'Spillerportal',
  testParticipantName: 'Testspiller',

  participantNameRequired: 'Skriv inn et spillernavn.',
  participantNameTooLong: (max: number) => `Spillernavnet er for langt (maks ${max} tegn).`,
  participantNameTaken: 'Dette spillernavnet er allerede i bruk i rommet. Velg et annet navn.',
  reservedTestName:
    'Dette navnet er reservert for testmodus. Velg et annet spillernavn.',
  maxParticipantsReached: 'Maks antall spillere er nådd.',
  participantNotFound: 'Spilleren finnes ikke.',
  participantRemoved: 'Gruizmaster har fjernet spilleren fra Gruizen.',
  sessionInvalid:
    'Kunne ikke koble til spilleren igjen. Bli med på nytt med romkode og spillernavn.',
  joinLocked: 'Gruizmaster har stengt for nye spillere.',
  onlyParticipantRole: 'Kun spilleren kan utføre denne handlingen.',
  cannotGradeThisParticipant: 'Du kan ikke rette denne spilleren.',

  peerGradingMinParticipants:
    'Retterunde krever minst to spillere. Med én spiller er peer-retting deaktivert.',
} as const;

export const RESERVED_TEST_PARTICIPANT_NAME = NB.testParticipantName;
