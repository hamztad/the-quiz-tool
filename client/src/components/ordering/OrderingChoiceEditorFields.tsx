import type { OrderingItem } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';
import { PixabayImagePicker } from '../media/PixabayImagePicker';
import { Button } from '../ui/Button';
import { EditorTextArea } from '../ui/Input';

interface OrderingChoiceEditorFieldsProps {
  item: OrderingItem;
  index: number;
  roomId?: string;
  canRemove: boolean;
  onTextChange: (text: string) => void;
  onMediaChange: (media: OrderingItem['media']) => void;
  onRemove: () => void;
}

export function OrderingChoiceEditorFields({
  item,
  index,
  roomId,
  canRemove,
  onTextChange,
  onMediaChange,
  onRemove,
}: OrderingChoiceEditorFieldsProps) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex min-h-[52px] items-start gap-2">
        {item.media && <ChoiceMediaDisplay media={item.media} variant="editor-preview" />}
        <EditorTextArea
          value={item.text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={`Etikett / fasit for element ${index + 1}…`}
          minRows={1}
          className="min-w-0 flex-1 bg-quiz-surface py-2 text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px] shrink-0 px-0"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Fjern element"
        >
          ×
        </Button>
      </div>
      <PixabayImagePicker
        roomId={roomId}
        media={item.media}
        onMediaChange={onMediaChange}
        compact
        label="Bilde (valgfritt)"
        hint="Tekst er alltid påkrevd. Bilde er valgfritt (påkrevd ved «Bruk kun bildene»)."
      />
    </div>
  );
}
