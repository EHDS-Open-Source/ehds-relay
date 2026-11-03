import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ehds-relay/ui";

import { useRef } from "react";

import { shellMessages } from "../shell/messages";

const text = shellMessages.datasetForm.actions;

/** "Save changes" (Save draft, Save and Publish) and Clear, which asks first. */
export function SaveMenu({
  busy,
  onSave,
  onClear,
}: {
  busy: boolean;
  onSave: (publish: boolean) => void;
  onClear: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" disabled={busy}>
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={busy}>
            {text.clear}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.clearTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.clearDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={onClear}>
              {text.clearConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
