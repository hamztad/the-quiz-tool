import { useEffect, type DependencyList } from 'react';
import { isShortcutSafeEvent } from '../lib/keyboard';

/**
 * Registers document-level shortcuts. Handlers run only when focus is NOT in an input/textarea.
 * Space and other typing keys are never intercepted.
 */
export function useAppKeyboardShortcuts(
  handler: (event: KeyboardEvent) => void,
  deps: DependencyList = [],
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isShortcutSafeEvent(event)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, deps);
}
