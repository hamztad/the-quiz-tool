/** Emoji + label for «legg til»-knapper i editoren. */
export function AddQuestionTypeLabel({ emoji, text }: { emoji: string; text: string }) {
  return (
    <>
      <span className="mr-1.5" aria-hidden>
        {emoji}
      </span>
      {text}
    </>
  );
}
