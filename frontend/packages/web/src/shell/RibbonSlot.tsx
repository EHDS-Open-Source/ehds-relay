import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SlotState {
  element: HTMLElement | null;
  setElement: (element: HTMLElement | null) => void;
}

const RibbonSlotContext = createContext<SlotState>({
  element: null,
  setElement: () => {},
});

/** Wrap a layout in this so its pages can show a ribbon where the layout puts `RibbonSlot`. */
export function RibbonSlotProvider({ children }: { children: ReactNode }) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  return (
    <RibbonSlotContext.Provider value={{ element, setElement }}>
      {children}
    </RibbonSlotContext.Provider>
  );
}

/** The place under the header where a page's ribbon appears. */
export function RibbonSlot() {
  const { setElement } = useContext(RibbonSlotContext);
  return <div ref={setElement} />;
}

/** Shows `children` in the layout's ribbon place while this is mounted. */
export function RibbonPortal({ children }: { children: ReactNode }) {
  const { element } = useContext(RibbonSlotContext);
  return element ? createPortal(children, element) : null;
}
