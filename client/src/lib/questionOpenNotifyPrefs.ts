const STORAGE_KEY = 'quiztool:notify-on-question-open';

export function readNotifyOnQuestionOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeNotifyOnQuestionOpen(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
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
  return Notification.requestPermission();
}

export function showBrowserQuestionOpenNotification(
  title: string,
  body: string,
  onActivate?: () => void,
): void {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body,
      tag: `gruiz-open-${Date.now()}`,
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
