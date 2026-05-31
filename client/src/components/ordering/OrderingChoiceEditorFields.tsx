import type { OrderingItem } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';
import { OptionImageAttachButton } from '../host/QuestionEditorWritingLayout';
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
    <div className="min-w-0 max-w-full flex-1 space-y-1 overflow-hidden">
      <div className="flex min-h-[52px] min-w-0 items-start gap-2">
        {item.media && <ChoiceMediaDisplay media={item.media} variant="editor-preview" />}
        <EditorTextArea
          value={item.text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={`Element ${index + 1}…`}
          minRows={1}
          className="min-w-0 flex-1 bg-white py-2 text-sm font-medium border-emerald-200/40"
        />
        <OptionImageAttachButton
          roomId={roomId}
          label={`Element ${index + 1}`}
          media={item.media}
          onMediaChange={onMediaChange}
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
    </div>
  );
}
