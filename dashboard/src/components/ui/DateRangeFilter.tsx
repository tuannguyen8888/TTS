"use client";

import { useState } from "react";

type DateRangeFilterProps = {
  initialFrom?: string;
  initialTo?: string;
  onApply: (range: { from?: string; to?: string }) => void;
};

export function DateRangeFilter({ initialFrom, initialTo, onApply }: DateRangeFilterProps) {
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");

  const apply = () => {
    onApply({
      from: from || undefined,
      to: to || undefined,
    });
  };

  const reset = () => {
    setFrom("");
    setTo("");
    onApply({});
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Từ ngày
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Đến ngày
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
        />
      </label>
      <button
        onClick={apply}
        className="btn-primary rounded-md px-3 py-2 text-xs font-medium"
      >
        Áp dụng
      </button>
      <button
        onClick={reset}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
      >
        Reset
      </button>
    </div>
  );
}

