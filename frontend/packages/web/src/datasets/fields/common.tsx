import {
  Field,
  FormMessage,
  Input,
  RadioChoices,
  TagInput,
  Textarea,
  cn,
  fieldErrorId,
} from "@ehds-relay/ui";
import type { ComponentProps, ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel, type FieldKey } from "../fields";
import type { DatasetFormValues } from "../formValues";
import {
  errorProps,
  inputId,
  panelClass,
  useFieldError,
  useGroupError,
  type FormPath,
} from "./formState";

// Inputs bound to the dataset form through React Hook Form's context.

const text = shellMessages.datasetForm;

/** A pale panel around grouped sub-fields. */
export function GroupPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(panelClass, className)}>{children}</div>;
}

interface TextInputProps extends Omit<ComponentProps<"input">, "name"> {
  path: FormPath;
  label: string;
  anchorId?: string;
  hint?: string;
  multiline?: boolean;
  /** The dataset needs this answer to be published: adds the star beside the label. */
  required?: boolean;
}

/** A labelled text box (or text area) for one form value. */
export function TextInput({
  path,
  label,
  anchorId,
  hint,
  multiline,
  required,
  className,
  ...inputProps
}: TextInputProps) {
  const { register } = useFormContext<DatasetFormValues>();
  const error = useFieldError(path);
  const id = inputId(path);
  return (
    <Field
      label={label}
      htmlFor={id}
      anchorId={anchorId}
      hint={hint}
      required={required}
      error={error}
      errorId={fieldErrorId(id)}
      className={className}
    >
      {multiline ? (
        <Textarea id={id} {...errorProps(path, error)} {...register(path)} />
      ) : (
        <Input
          id={id}
          {...inputProps}
          {...errorProps(path, error)}
          {...register(path)}
        />
      )}
    </Field>
  );
}

/** A top-level field that is a single text box: its wrapper is the field's anchor. */
export function TextField({
  name,
  ...props
}: { name: FieldKey & FormPath } & Omit<
  TextInputProps,
  "path" | "label" | "anchorId"
>) {
  return (
    <TextInput
      path={name}
      label={fieldLabel(name)}
      anchorId={fieldAnchorId(name)}
      {...props}
    />
  );
}

/** A list of short texts entered as tags (keywords, code values, identifiers). */
export function TagField({
  name,
  required,
}: {
  name: "keyword" | "code_values" | "identifier";
  required?: boolean;
}) {
  const { control } = useFormContext<DatasetFormValues>();
  const error = useFieldError(name);
  const id = inputId(name);
  return (
    <Field
      label={fieldLabel(name)}
      htmlFor={id}
      anchorId={fieldAnchorId(name)}
      hint={text.tagHint}
      required={required}
      error={error}
      errorId={fieldErrorId(id)}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TagInput
            id={id}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            invalid={Boolean(error)}
            aria-describedby={error ? fieldErrorId(id) : undefined}
          />
        )}
      />
    </Field>
  );
}

/** A yes/no question. */
export function YesNoField({
  name,
}: {
  name: "structured_data" | "has_personal_data";
}) {
  const { register } = useFormContext<DatasetFormValues>();
  const error = useFieldError(name);
  return (
    <Field
      label={fieldLabel(name)}
      anchorId={fieldAnchorId(name)}
      required
      error={error}
      errorId={fieldErrorId(inputId(name))}
    >
      <RadioChoices
        idPrefix={inputId(name)}
        choices={[
          { value: "yes", label: text.yes },
          { value: "no", label: text.no },
        ]}
        {...register(name)}
      />
    </Field>
  );
}

/** Error text for a group of inputs (a list or a pair), shown where the group is. */
export function GroupError({ path }: { path: string }) {
  const message = useGroupError(path);
  return message ? (
    <FormMessage id={fieldErrorId(inputId(path))}>{message}</FormMessage>
  ) : null;
}
