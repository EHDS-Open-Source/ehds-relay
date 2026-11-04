import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Icon, type IconName } from "../icons";
import { messages } from "../messages";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastOptions {
  tone?: ToastTone;
  message: ReactNode;
  /** An optional follow-up such as "Try again". Dismisses the toast once pressed. */
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastOptions {
  id: number;
  tone: ToastTone;
}

interface ToastApi {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const MAX_TOASTS = 3;
export const TOAST_DURATION_MS = 5000;

const icons: Record<ToastTone, IconName> = {
  success: "tick",
  info: "info",
  warning: "warning",
  error: "star",
};

// Shades that stay readable on the blue card.
const iconColours: Record<ToastTone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  error: "text-error",
};

/** Warnings and errors need a decision or a retry, so they stay until dismissed. */
const sticky = (tone: ToastTone) => tone === "warning" || tone === "error";

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(TOAST_DURATION_MS);
  const { id, tone } = toast;

  useEffect(() => {
    if (sticky(tone) || paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onDismiss(id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - startedAt),
      );
    };
  }, [id, tone, paused, onDismiss]);

  const urgent = sticky(tone);

  return (
    <li
      data-slot="toast"
      data-tone={tone}
      data-surface="blue"
      // Each toast is its own live region: warnings and errors interrupt, the rest wait.
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-card bg-blue py-4 pr-3 pl-4 text-[0.95em] leading-[1.4] font-semibold text-white shadow-overlay duration-(--motion-enter) ease-(--ease-out) animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none md:w-[min(440px,calc(100vw-32px))] [&_:focus-visible]:outline-yellow"
    >
      <Icon
        name={icons[tone]}
        className={iconColours[tone]}
        style={{ width: 22, height: 22 }}
      />
      <div className="min-w-0 flex-1">{toast.message}</div>
      {toast.action ? (
        <button
          type="button"
          className="rounded-[8px] p-2 font-bold whitespace-nowrap text-yellow underline-offset-[3px] hover:underline"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={messages.feedback.dismiss}
        className="inline-flex shrink-0 rounded-full p-2 text-white/80 hover:bg-white/12 hover:text-white"
        onClick={() => onDismiss(id)}
      >
        <Icon name="close" size="sm" />
      </button>
    </li>
  );
}

/** Holds the toast stack. Mount once near the root of the app. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    const entry: ToastEntry = { ...options, id, tone: options.tone ?? "info" };
    // Newest at the bottom; the oldest makes room once there are too many.
    setToasts((current) => [...current, entry].slice(-MAX_TOASTS));
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* One list in the order shown, newest at the bottom: 24px from the corner, or full
          width 12px in from the edges on phones. */}
      <section
        aria-label={messages.feedback.notifications}
        className="pointer-events-none fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-[60] md:inset-x-auto md:right-6 md:bottom-[calc(24px+env(safe-area-inset-bottom,0px))]"
      >
        <ol className="flex flex-col items-stretch gap-3 md:items-end">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside a ToastProvider");
  return api;
}
