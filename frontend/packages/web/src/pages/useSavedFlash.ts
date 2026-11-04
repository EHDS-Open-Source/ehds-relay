import { useCallback, useEffect, useRef, useState } from "react";

const FLASH_MS = 1800;

/** True for a moment after `flash()`: the "Saved" state of a Save changes button. */
export function useSavedFlash(): [boolean, () => void, () => void] {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setSaved(false);
  }, []);
  const flash = useCallback(() => {
    clearTimeout(timer.current);
    setSaved(true);
    timer.current = setTimeout(() => {
      setSaved(false);
    }, FLASH_MS);
  }, []);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  return [saved, flash, clear];
}
