/** True when the user is typing in a field — skip app-level keyboard shortcuts. */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

export function isShortcutSafeEvent(event: KeyboardEvent): boolean {
  return !isEditableElement(event.target);
}
