import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
} from "@ehds-relay/ui";

import { useRef, useState } from "react";

import { shellMessages } from "../shell/messages";

const text = shellMessages.datasetForm.actions;

/**
 * "Save changes" (Save draft, Save and Publish) and Clear. Clear asks first, unless the
 * form is already empty.
 */
export function SaveMenu({
  busy,
  onSave,
  onClear,
  isEmpty,
  datasetTitle,
}: {
  busy: boolean;
  onSave: (publish: boolean) => void;
  onClear: () => void;
  /** Whether the form has nothing in it, so clearing needs no confirmation. */
  isEmpty?: () => boolean;
  /** Named in bold in the confirmation, when the dataset has a title. */
  datasetTitle?: string;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" busy={busy}>
            <Icon name="save" size="sm" />
            {text.saveMenu}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          ref={menu}
          align="start"
          onCloseAutoFocus={(event) => {
            // If saving moved focus to a field that needs fixing, leave it there
            const active = document.activeElement;
            if (
              active &&
              active !== document.body &&
              !menu.current?.contains(active)
            ) {
              event.preventDefault();
            }
          }}
        >
          <DropdownMenuItem onSelect={() => onSave(false)}>
            {text.saveDraft}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onSave(true)}>
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
        <Icon name="eraser" size="sm" />
        {text.clear}
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
