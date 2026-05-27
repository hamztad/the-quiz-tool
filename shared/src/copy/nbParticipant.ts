/** Brukerrettet norsk — «deltaker», ikke «lag». */
export const NB = {
  participant: 'deltaker',
  participants: 'deltakere',
  participantName: 'deltakernavn',
  participantPortal: 'Deltakerportal',
  testParticipantName: 'Testdeltaker',

  participantNameRequired: 'Skriv inn et deltakernavn.',
  participantNameTooLong: (max: number) => `Deltakernavnet er for langt (maks ${max} tegn).`,
  reservedTestName:
    'Dette navnet er reservert for testmodus. Velg et annet deltakernavn.',
  maxParticipantsReached: 'Maks antall deltakere er nådd.',
  participantNotFound: 'Deltakeren finnes ikke.',
  participantRemoved: 'Quizmaster har fjernet deltakeren fra quizen.',
  sessionInvalid:
    'Kunne ikke koble til deltakeren igjen. Bli med på nytt med romkode og deltakernavn.',
  joinLocked: 'Quizmaster har stengt for nye deltakere.',
  onlyParticipantRole: 'Kun deltakeren kan utføre denne handlingen.',
  cannotGradeThisParticipant: 'Du kan ikke rette denne deltakeren.',

  peerGradingMinParticipants:
    'Retterunde krever minst to deltakere. Med én deltaker er peer-retting deaktivert.',
} as const;

export const RESERVED_TEST_PARTICIPANT_NAME = NB.testParticipantName;
