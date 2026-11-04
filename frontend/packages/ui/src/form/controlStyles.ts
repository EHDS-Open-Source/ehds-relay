// Shared looks for the native checkbox, radio button and switch. The inputs stay native
// (default look removed) so keyboard and screen reader behaviour comes for free.

const base =
  "peer shrink-0 appearance-none border-2 border-ink-3 bg-white transition-colors duration-150 hover:border-blue disabled:cursor-not-allowed disabled:border-blue-tint-80 disabled:bg-blue-tint-90 disabled:hover:border-blue-tint-80 aria-invalid:border-destructive";

const baseOnBlue =
  "peer shrink-0 appearance-none border-2 border-white bg-transparent transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error";

export function checkboxClass(onBlue: boolean): string {
  return onBlue
    ? `${baseOnBlue} size-[22px] rounded-[6px] checked:border-yellow checked:bg-yellow`
    : `${base} size-[22px] rounded-[6px] checked:border-blue checked:bg-blue`;
}

// The dot is an inset ring: 2px border, 4px gap, then a 10px dot.
export function radioClass(onBlue: boolean): string {
  return onBlue
    ? `${baseOnBlue} size-[22px] rounded-full checked:border-yellow checked:bg-yellow checked:shadow-[inset_0_0_0_6px_var(--blue)]`
    : `${base} size-[22px] rounded-full checked:border-blue checked:bg-blue checked:shadow-[inset_0_0_0_4px_white]`;
}

export function toggleClass(onBlue: boolean): string {
  const knob =
    "relative h-7 w-12 rounded-full before:absolute before:top-[3px] before:left-[3px] before:size-[18px] before:rounded-full before:transition-transform before:duration-150 before:content-[''] checked:before:translate-x-5";
  return onBlue
    ? `${baseOnBlue} ${knob} before:bg-white checked:border-yellow checked:bg-yellow checked:before:bg-blue`
    : `${base} ${knob} before:bg-ink-3 checked:border-blue checked:bg-blue checked:before:bg-yellow disabled:before:bg-blue-tint-80`;
}
