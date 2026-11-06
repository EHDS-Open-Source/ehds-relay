import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Icon,
} from "@ehds-relay/ui";

import { shellMessages } from "../shell/messages";

const text = shellMessages.datasetForm.leave;

export interface LeaveDialogProps {
  open: boolean;
  /** Named in bold, when the dataset has a title. */
  datasetTitle?: string;
  /** Save and leave is running: it shows busy and the other choices are off. */
  pending?: boolean;
  onKeepEditing: () => void;
  onLeave: () => void;
  onSave: () => void;
  /** Runs when the dialog has closed; preventing the default decides where focus goes. */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Asks what to do with unsaved changes before leaving the dataset form. Keep editing has
 * focus first; Esc, a click outside and Keep editing all stay on the form, and focus
 * returns to what opened the dialog. On phones the buttons stack with Save and leave on top.
 */
export function LeaveDialog({
  open,
  datasetTitle,
  pending = false,
  onKeepEditing,
  onLeave,
  onSave,
  onCloseAutoFocus,
}: LeaveDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onKeepEditing();
      }}
    >
      <AlertDialogContent
        onOverlayClick={() => {
          if (!pending) onKeepEditing();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Icon name="save" size="lg" />
            {text.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {datasetTitle ? (
                <>
                  {text.description}{" "}
                  <strong className="font-bold">{datasetTitle}</strong>.{" "}
                  {text.descriptionTrail}
                </>
              ) : (
                text.descriptionUntitled
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {text.keepEditing}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onLeave}
          >
            {text.leave}
          </Button>
          <Button
            type="button"
            variant="primary"
            busy={pending}
            onClick={onSave}
          >
            {text.saveAndLeave}
            <Icon name="save" size="md" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
