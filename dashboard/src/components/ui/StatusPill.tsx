"use client";

type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  const normalized = status.toLowerCase();
  const cls =
    normalized === "completed" || normalized === "active"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : normalized === "failed" || normalized === "revoked"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

