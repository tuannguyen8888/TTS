"use client";

type SectionHeaderProps = {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
};

export function SectionHeader({ title, description, rightSlot }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
        ) : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}

