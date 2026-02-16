"use client";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "danger";
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900 dark:text-slate-100",
  success: "text-emerald-600",
  danger: "text-rose-600",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{hint}</p> : null}
    </div>
  );
}

