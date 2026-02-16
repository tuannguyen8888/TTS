"use client";

import { useEffect, useState } from "react";
import { fetchTransactions } from "@/lib/api";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime, formatNumber } from "@/lib/format";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";

export default function TransactionsPage() {
  const [data, setData] = useState<Array<{ id: string; jobId: string; charCount: number; status: string; createdAt: string }> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  useEffect(() => {
    fetchTransactions(range.from, range.to)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [range.from, range.to]);

  if (err) return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Lỗi: {err}</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 rounded-lg" />
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Transaction Log"
        description="Theo dõi chi tiết từng giao dịch để đối soát usage và xử lý lỗi nhanh hơn."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter
              initialFrom={range.from}
              initialTo={range.to}
              onApply={(next) => {
                setErr(null);
                setData(null);
                setRange(next);
              }}
            />
            <p className="text-sm text-slate-500 dark:text-slate-300">Tổng bản ghi: {formatNumber(data.length)}</p>
          </div>
        }
      />

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Job ID</th>
              <th className="px-4 py-3 text-left font-medium">Ký tự</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-left font-medium">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-300">
                  Chưa có giao dịch
                </td>
              </tr>
            )}
            {data.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-800/70">
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-100">{r.jobId}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatNumber(r.charCount)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
