import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dropdown,
  Field,
  Icon,
  useToast,
} from "@ehds-relay/ui";
import { useState } from "react";

import { shellMessages } from "../shell/messages";
import { transferErrorMessage } from "./errors";
import { useTransferOwnership, type Member } from "./queries";

const text = shellMessages.members.transferDialog;

export interface TransferOwnershipDialogProps {
  orgId: string;
  /** The owner handing over: named in the title. */
  owner: Member | null;
  /** The members who can take over (everyone who is not an owner). */
  candidates: readonly Member[];
  onOpenChange: (open: boolean) => void;
}

/** Lets an owner hand ownership to another member; they become a standard user. */
export function TransferOwnershipDialog({
  orgId,
  owner,
  candidates,
  onOpenChange,
}: TransferOwnershipDialogProps) {
  const transfer = useTransferOwnership(orgId);
  const toast = useToast();
  const [chosen, setChosen] = useState<string | undefined>();
  const selected =
    candidates.find((member) => member.user_id === chosen) ?? candidates[0];

  // Start fresh each time the dialog opens
  const [wasOpen, setWasOpen] = useState(owner !== null);
  if ((owner !== null) !== wasOpen) {
    setWasOpen(owner !== null);
    if (owner) {
      setChosen(undefined);
      transfer.reset();
    }
  }

  const close = (next: boolean) => {
    if (!next && transfer.isPending) return;
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!selected) return;
    const { name } = selected;
    try {
      await transfer.mutateAsync(selected.user_id);
    } catch {
      return; // shown in the dialog
    }
    // The page may already have dropped this dialog (the caller is no longer an owner);
    // the toast lives above it, so it still shows.
    onOpenChange(false);
    toast.show({
      tone: "success",
      message: shellMessages.members.transferred(name),
    });
  };

  const name = owner?.name ?? "";
  return (
    <AlertDialog open={owner !== null} onOpenChange={close}>
      <AlertDialogContent
        onOverlayClick={() => {
          close(false);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Icon name="transfer" size="lg" />
            {text.title(name)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {selected ? (
                <>
                  <strong className="font-bold">{name}</strong> {text.lead}
                </>
              ) : (
                text.noCandidates
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {selected ? (
          <Field label={text.newOwnerLabel} htmlFor="transfer-new-owner">
            <Dropdown
              id="transfer-new-owner"
              value={selected.user_id}
              disabled={transfer.isPending}
              options={candidates.map((member) => ({
                value: member.user_id,
                label: member.name,
              }))}
              onValueChange={setChosen}
            />
          </Field>
        ) : null}
        {transfer.isError ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {transferErrorMessage(transfer.error)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={transfer.isPending}>
            {selected ? text.cancel : text.close}
          </AlertDialogCancel>
          {selected ? (
            <Button
              type="button"
              variant="primary"
              busy={transfer.isPending}
              onClick={() => void confirm()}
            >
              {transfer.isPending ? text.sending : text.confirm}
              <Icon name="transfer" size="md" />
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
