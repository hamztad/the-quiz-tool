const RETURN_KEY_PREFIX = 'quiz_test_return_';

export function saveTestReturnPath(roomId: string, path: string) {
  try {
    sessionStorage.setItem(`${RETURN_KEY_PREFIX}${roomId}`, path);
  } catch {
    // ignore
  }
}

export function getTestReturnPath(roomId: string): string | null {
  try {
    return sessionStorage.getItem(`${RETURN_KEY_PREFIX}${roomId}`);
  } catch {
    return null;
  }
}

export function clearTestReturnPath(roomId: string) {
  try {
    sessionStorage.removeItem(`${RETURN_KEY_PREFIX}${roomId}`);
  } catch {
    // ignore
  }
}
