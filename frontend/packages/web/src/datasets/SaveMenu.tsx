import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  SaveButton,
} from "@ehds-relay/ui";

import { useRef, useState } from "react";

import { shellMessages } from "../shell/messages";

const text = shellMessages.datasetForm.actions;

/**
 * "Save changes" (Save draft, Save and Publish) and Clear. Clear asks first, unless the
 * form is already empty. The save runs once the menu has closed and handed focus back, so
 * a save that finds problems can move focus to the first one, for mouse users too.
 */
export function SaveMenu({
  busy,
  saved = false,
  onSave,
  onClear,
  isEmpty,
  datasetTitle,
}: {
  busy: boolean;
  /** Shows "Saved" in the success colours for a moment after a save. */
  saved?: boolean;
  onSave: (publish: boolean) => void;
  onClear: () => void;
  /** Whether the form has nothing in it, so clearing needs no confirmation. */
  isEmpty?: () => boolean;
  /** Named in bold in the confirmation, when the dataset has a title. */
  datasetTitle?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  // The save chosen in the menu, run when the menu has closed
  const chosen = useRef<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SaveButton
            ref={trigger}
            type="button"
            variant="secondary"
            busy={busy}
            saved={saved}
            label={text.saveMenu}
            busyLabel={text.saving}
            savedLabel={text.saved}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          onCloseAutoFocus={(event) => {
            const publish = chosen.current;
            if (publish === null) return;
            chosen.current = null;
            // Focus goes back to the button first; a save with problems then moves it on
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
            onSave(publish);
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              chosen.current = false;
            }}
          >
            {text.saveDraft}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              chosen.current = true;
            }}
          >
            {text.saveAndPublish}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => (isEmpty?.() ? onClear() : setConfirming(true))}
      >
        {text.clear}
        <Icon name="eraser" size="md" />
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        icon="eraser"
        title={text.clearTitle}
        description={
          <>
            {datasetTitle ? (
              <>
                {text.clearDescription}{" "}
                <strong className="font-bold">{datasetTitle}</strong>{" "}
                {text.clearDescriptionTrail}
              </>
            ) : (
              text.clearDescriptionUntitled
            )}{" "}
            <strong className="font-bold">{text.clearIrreversible}</strong>
          </>
        }
        cancelLabel={text.cancel}
        confirmLabel={text.clearConfirm}
        destructive
        onConfirm={() => {
          setConfirming(false);
          onClear();
        }}
      />
    </div>
  );
}
