import { useCallback, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  browserNotificationsSupported,
  requestBrowserNotificationPermission,
} from '../../lib/questionOpenNotifyPrefs';

export type NotificationPermissionHint =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';

function hintMessage(result: NotificationPermissionHint, context: 'question' | 'quizEnd'): string {
  if (result === 'unsupported') {
    return 'In-app-varsler er på. Nettleservarsel støttes ikke her.';
  }
  if (result === 'granted') {
    return context === 'quizEnd'
      ? 'Varsler er på — du får beskjed når Gruizen avsluttes og når sluttresultatet er klart.'
      : 'Varsler er på — du får beskjed i appen og fra nettleseren når en oppgave åpnes.';
  }
  if (result === 'denied') {
    return context === 'quizEnd'
      ? 'In-app-varsler er på. Tillat systemvarsler i nettleseren om du vil ha beskjed når fanen er i bakgrunnen.'
      : 'In-app-varsler er på. Nettleseren blokkerte systemvarsler — tillat varsler i nettleserinnstillinger om du vil ha det.';
  }
  return 'In-app-varsler er på. Godta systemvarsler i nettleseren for ekstra beskjed.';
}

interface NotificationPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function NotificationPermissionDialog({
  open,
  onClose,
  onConfirm,
}: NotificationPermissionDialogProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="gruiz-notify-permission-title" align="center">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <h2 id="gruiz-notify-permission-title" className="text-lg font-bold text-quiz-text">
            Gruiz vil vise varsler
          </h2>
          <p className="text-sm text-quiz-muted leading-relaxed">
            For beskjed når fanen er i bakgrunnen, må nettleseren tillate varsler. Trykk «Tillat
            varsler» — deretter godta i neste steg fra nettleseren.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Ikke nå
          </Button>
          <Button type="button" variant="cta" onClick={onConfirm}>
            Tillat varsler
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Be om nettleservarsler med egen dialog først, deretter systemprompt. */
export function useBrowserNotificationPermission(context: 'question' | 'quizEnd') {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const applyPermissionResult = useCallback(
    (permission: NotificationPermission | 'unsupported') => {
      const mapped: NotificationPermissionHint =
        permission === 'unsupported'
          ? 'unsupported'
          : permission === 'granted'
            ? 'granted'
            : permission === 'denied'
              ? 'denied'
              : 'default';
      setHint(hintMessage(mapped, context));
    },
    [context],
  );

  const requestPermission = useCallback(async () => {
    setHint(null);
    if (!browserNotificationsSupported()) {
      applyPermissionResult('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      applyPermissionResult('granted');
      return;
    }
    if (Notification.permission === 'denied') {
      applyPermissionResult('denied');
      return;
    }
    setDialogOpen(true);
  }, [applyPermissionResult]);

  const confirmDialog = useCallback(async () => {
    setDialogOpen(false);
    const permission = await requestBrowserNotificationPermission();
    applyPermissionResult(permission);
  }, [applyPermissionResult]);

  const cancelDialog = useCallback(() => {
    setDialogOpen(false);
    setHint('In-app-varsler er på uten nettleservarsel.');
  }, []);

  const permissionDialog = (
    <NotificationPermissionDialog
      open={dialogOpen}
      onClose={cancelDialog}
      onConfirm={() => void confirmDialog()}
    />
  );

  return { hint, setHint, requestPermission, permissionDialog };
}
