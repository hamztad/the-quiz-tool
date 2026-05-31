const STORAGE_KEY_OPEN = 'quiztool:notify-on-question-open';
const STORAGE_KEY_QUIZ_END = 'quiztool:notify-on-quiz-end';

export function readNotifyOnQuestionOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_OPEN) === '1';
  } catch {
    return false;
  }
}

export function writeNotifyOnQuestionOpen(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_OPEN, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function browserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!browserNotificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const originalTitle = document.title;
  document.title = 'Gruiz vil vise varsler';
  try {
    return await Notification.requestPermission();
  } finally {
    document.title = originalTitle;
  }
}

export function readNotifyOnQuizEnd(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_QUIZ_END) === '1';
  } catch {
    return false;
  }
}

export function writeNotifyOnQuizEnd(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUIZ_END, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function showBrowserNotification(
  title: string,
  body: string,
  onActivate?: () => void,
  tagPrefix = 'gruiz',
): void {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body,
      tag: `${tagPrefix}-${Date.now()}`,
      icon: '/favicon.ico',
    });
    notification.onclick = () => {
      window.focus();
      onActivate?.();
      notification.close();
    };
  } catch {
    /* ignore — e.g. insecure context */
  }
}

/** @deprecated Use showBrowserNotification */
export function showBrowserQuestionOpenNotification(
  title: string,
  body: string,
  onActivate?: () => void,
): void {
  showBrowserNotification(title, body, onActivate, 'gruiz-open');
}
