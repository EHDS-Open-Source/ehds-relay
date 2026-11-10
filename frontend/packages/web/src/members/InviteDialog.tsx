import { zInvitationCreateDto, type Schemas } from "@ehds-relay/api-client";
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
  FormMessage,
  Icon,
  Input,
  Textarea,
  fieldErrorId,
  useToast,
} from "@ehds-relay/ui";
import { useState, type FormEvent } from "react";

import { shellMessages } from "../shell/messages";
import {
  DetailedApiError,
  errorStatus,
  useInvite,
  type MemberRole,
} from "./queries";
import { roleOptions } from "./format";

const m = shellMessages.members;
const text = m.invitations;

type FieldName = "email" | "name" | "message";
type Errors = Partial<Record<FieldName, string>>;

const ID: Record<FieldName, string> = {
  email: "invite-email",
  name: "invite-name",
  message: "invite-message",
};
const ORDER: FieldName[] = ["email", "name", "message"];

const NAME_MAX = zInvitationCreateDto.shape.name.maxLength ?? 200;
const MESSAGE_MAX =
  zInvitationCreateDto.shape.message.unwrap().unwrap().maxLength ?? 1000;

// A loose check; the generated schema's pattern and the server have the final say.
const looksLikeEmail = (value: string) =>
  /^\S+@\S+\.\S+$/.test(value) &&
  zInvitationCreateDto.shape.email.safeParse(value).success;

/** Field problems in the entered values, or none when they can be sent. */
function check(values: {
  email: string;
  name: string;
  message: string;
}): Errors {
  const errors: Errors = {};
  if (values.email === "") errors.email = text.emailRequired;
  else if (!looksLikeEmail(values.email)) errors.email = text.emailInvalid;
  if (values.name === "") errors.name = text.nameRequired;
  else if (values.name.length > NAME_MAX)
    errors.name = text.nameTooLong(NAME_MAX);
  if (values.message.length > MESSAGE_MAX)
    errors.message = text.messageTooLong(
      MESSAGE_MAX,
      values.message.length - MESSAGE_MAX,
    );
  return errors;
}

/** Where a failed send is shown: on the field it names, or as a form message. */
function serverProblem(
  error: unknown,
  email: string,
): { errors: Errors; form?: string } {
  const status = errorStatus(error);
  if (status === 409) {
    const detail = error instanceof DetailedApiError ? error.detail : "";
    const message = detail.includes("already a member")
      ? text.alreadyMemberFor(email)
      : detail.includes("already invited")
        ? text.alreadyInvitedFor(email)
        : text.errors.notPending;
    return { errors: { email: message } };
  }
  if (status === 422 && error instanceof DetailedApiError) {
    const errors: Errors = {};
    for (const field of error.fields) {
      if (field === "email" || field === "name" || field === "message")
        errors[field] = text.fieldInvalid[field];
    }
    if (Object.keys(errors).length > 0) return { errors };
    return { errors: {}, form: text.errors.invalid };
  }
  return {
    errors: {},
    form: status === 403 ? text.errors.forbidden : text.errors.failed,
  };
}

export interface InviteDialogProps {
  orgId: string;
  /** Named in bold in the description. */
  orgName: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Invite someone to the organisation by email, with their name and an optional message. */
export function InviteDialog({
  orgId,
  orgName,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const invite = useInvite(orgId);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("standard");
  const [message, setMessage] = useState("");
  const [clientErrors, setClientErrors] = useState<Errors>({});
  // The server's verdict stays until the next send; editing a field clears its own
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | undefined>();

  // Start fresh each time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setEmail("");
      setName("");
      setRole("standard");
      setMessage("");
      setClientErrors({});
      setServerErrors({});
      setFormError(undefined);
      invite.reset();
    }
  }

  const errors: Errors = { ...serverErrors, ...clientErrors };
  const edit = (field: FieldName) => {
    setClientErrors((current) => ({ ...current, [field]: undefined }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  const close = (next: boolean) => {
    if (!next && invite.isPending) return;
    onOpenChange(next);
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const values = {
      email: email.trim(),
      name: name.trim(),
      message: message.trim(),
    };
    const problems = check(values);
    setServerErrors({});
    setFormError(undefined);
    setClientErrors(problems);
    const first = ORDER.find((field) => problems[field]);
    if (first) {
      document.getElementById(ID[first])?.focus();
      return;
    }
    const body: Schemas["InvitationCreateDTO"] = {
      email: values.email,
      name: values.name,
      role,
      ...(values.message !== "" && { message: values.message }),
    };
    invite.mutate(body, {
      onSuccess: (created) => {
        onOpenChange(false);
        toast.show({ tone: "success", message: text.sent(created.email) });
      },
      onError: (error) => {
        const problem = serverProblem(error, values.email);
        setServerErrors(problem.errors);
        setFormError(problem.form);
        const first = ORDER.find((field) => problem.errors[field]);
        if (first) document.getElementById(ID[first])?.focus();
      },
    });
  }

  const props = (field: FieldName) => ({
    id: ID[field],
    "aria-invalid": errors[field] ? (true as const) : undefined,
    "aria-describedby": errors[field] ? fieldErrorId(ID[field]) : undefined,
  });

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent
        className="data-[size=default]:max-w-[min(520px,calc(100%-40px))]"
        onOverlayClick={() => {
          close(false);
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById(ID.email)?.focus();
        }}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Icon name="addUser" size="lg" />
              {text.dialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {text.dialog.lead}{" "}
              <strong className="font-bold">
                {orgName ?? text.dialog.fallbackOrg}
              </strong>
              . {text.dialog.trail}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field
            label={text.emailLabel}
            htmlFor={ID.email}
            required
            error={errors.email}
          >
            <Input
              {...props("email")}
              type="email"
              placeholder={text.emailPlaceholder}
              value={email}
              autoComplete="off"
              onChange={(event) => {
                setEmail(event.target.value);
                edit("email");
              }}
            />
          </Field>
          <Field
            label={text.nameLabel}
            htmlFor={ID.name}
            required
            hint={text.nameHint}
            error={errors.name}
          >
            <Input
              {...props("name")}
              placeholder={text.namePlaceholder}
              value={name}
              autoComplete="off"
              onChange={(event) => {
                setName(event.target.value);
                edit("name");
              }}
            />
          </Field>
          <Field label={text.roleLabel} htmlFor="invite-role">
            <Dropdown
              id="invite-role"
              value={role}
              options={roleOptions.map((option) => ({
                value: option,
                label: m.roles[option],
              }))}
              onValueChange={(value) => {
                setRole(value as MemberRole);
              }}
            />
          </Field>
          <Field
            label={text.messageLabel}
            htmlFor={ID.message}
            hint={text.messageHint}
            error={errors.message}
          >
            <Textarea
              {...props("message")}
              rows={3}
              placeholder={text.messagePlaceholder}
              className="min-h-[88px] resize-y"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                edit("message");
              }}
            />
          </Field>
          {formError ? <FormMessage>{formError}</FormMessage> : null}
          <AlertDialogFooter className="-mt-2 justify-between max-[480px]:flex-row max-[480px]:*:w-auto">
            <AlertDialogCancel
              type="button"
              size="sm"
              disabled={invite.isPending}
            >
              {text.dialog.cancel}
            </AlertDialogCancel>
            <Button type="submit" size="sm" busy={invite.isPending}>
              {invite.isPending ? text.dialog.sending : text.dialog.send}
              <Icon name="addUser" size="sm" />
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
