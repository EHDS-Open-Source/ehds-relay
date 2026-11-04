import type { ReactNode } from "react";

import { Button } from "../components/button";
import { FormMessage } from "../components/form-message";
import { Icon } from "../icons";
import { messages } from "../messages";

export interface RepeatableListProps<T extends { id: string }> {
  /** One entry per row; `id` is a stable key (e.g. from a form library's field array). */
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  /** Name of the remove button of a row; defaults to "Remove" plus the row number. */
  removeLabel?: (index: number) => string;
  /** Rows that can't be removed, e.g. 1 to always keep one row. */
  minItems?: number;
  /**
   * A problem with the list as a whole (e.g. "Add at least one."): shown under the Add
   * button, which turns to the error colour. Pass `errorId` to point the group at it.
   */
  error?: string;
  errorId?: string;
}

/** Rows of inputs that the user can add to and remove from. */
export function RepeatableList<T extends { id: string }>({
  items,
  renderItem,
  onAdd,
  onRemove,
  addLabel = messages.repeatableList.add,
  removeLabel = (index) => `${messages.repeatableList.remove} ${index + 1}`,
  minItems = 0,
  error,
  errorId,
}: RepeatableListProps<T>) {
  return (
    <div className="flex flex-col gap-3">
      {items.length ? (
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
              {items.length > minItems ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label={removeLabel(index)}
                  onClick={() => onRemove(index)}
                >
                  <Icon name="close" size="sm" />
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-invalid={error ? true : undefined}
          className={
            error
              ? "border-destructive text-destructive hover:border-destructive"
              : undefined
          }
          onClick={onAdd}
        >
          <Icon name="plus" size="sm" />
          {addLabel}
        </Button>
      </div>
      {error ? <FormMessage id={errorId}>{error}</FormMessage> : null}
    </div>
  );
}
