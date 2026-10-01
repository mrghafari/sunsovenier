/**
 * Shared visual language for negotiated sales contracts.
 * Deep petrol, pale mineral, and a restrained brass keyline keep contract
 * records distinct from ordinary order tables while preserving readable dark mode.
 */
export const contractTheme = {
  badge: "inline-flex items-center rounded-md border border-teal-700/30 bg-teal-100 px-2 py-0.5 text-xs font-semibold tracking-wide text-teal-950 dark:border-teal-300/25 dark:bg-teal-950/70 dark:text-teal-100",
  text: "text-teal-900 dark:text-teal-100",
  panel: "rounded-lg border border-teal-800/20 bg-teal-50/70 dark:border-teal-300/20 dark:bg-teal-950/30",
  row: "border-b border-teal-900/10 bg-teal-50/40 last:border-0 hover:bg-teal-100/70 dark:border-teal-100/10 dark:bg-teal-950/20 dark:hover:bg-teal-900/40",
  table: "w-full border-collapse text-sm",
  tableHead: "bg-teal-900 text-start text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-50 dark:bg-teal-950 dark:text-teal-100",
  tableRow: "border-b border-teal-900/15 text-teal-950 dark:border-teal-100/10 dark:text-teal-100",
  tableTotal: "bg-teal-100 font-bold text-teal-950 dark:bg-teal-900/70 dark:text-teal-50",
  button: "border-teal-800 bg-teal-800 text-white hover:bg-teal-900 dark:border-teal-200/40 dark:bg-teal-900 dark:text-teal-50 dark:hover:bg-teal-800",
  selected: "border-teal-700 bg-teal-100/80 ring-1 ring-inset ring-teal-700/20 dark:border-teal-300/60 dark:bg-teal-950/60 dark:ring-teal-200/20",
  outline: "border-teal-800/35 text-teal-900 hover:bg-teal-100 hover:text-teal-950 dark:border-teal-200/30 dark:text-teal-100 dark:hover:bg-teal-900/60 dark:hover:text-teal-50",
} as const;