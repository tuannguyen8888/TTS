"use client";

import { useEffect, useState } from "react";
import { fetchBillingLedger } from "@/lib/api";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { formatAmount, formatNumber } from "@/lib/format";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";

export default function BillingPage() {
  const [data, setData] = useState<
    Array<{ id: string; jobId: string; charCount: number; amount: string; month: string; createdAt?: string }> | null
  >(null);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  useEffect(() => {
    fetchBillingLedger()
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [setData, setErr]);

  if (err) return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Lỗi: {err}</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  const filteredData = data.filter((row) => {
    if (!row.createdAt) return true;
    const created = new Date(row.createdAt).getTime();
    if (Number.isNaN(created)) return true;
    const fromTime = range.from ? new Date(`${range.from}T00:00:00`).getTime() : null;
    const toTime = range.to ? new Date(`${range.to}T23:59:59`).getTime() : null;
    if (fromTime !== null && created < fromTime) return false;
    if (toTime !== null && created > toTime) return false;
    return true;
  });

  const total = filteredData.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
  const byMonthMap = filteredData.reduce<Record<string, number>>((acc, row) => {
    acc[row.month] = (acc[row.month] ?? 0) + parseFloat(row.amount || "0");
    return acc;
  }, {});
  const byMonth = Object.entries(byMonthMap).map(([month, amount]) => ({ month, amount }));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Billing Ledger"
        description="Tổng hợp chi phí theo giao dịch để phục vụ đối soát và tính tiền khách hàng."
        rightSlot={
          <DateRangeFilter
            initialFrom={range.from}
            initialTo={range.to}
            onApply={(next) => setRange(next)}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng ước tính" value={formatAmount(total)} />
        <StatCard label="Số bản ghi" value={formatNumber(filteredData.length)} />
        <StatCard
          label="Giá trị trung bình / giao dịch"
          value={formatAmount(filteredData.length ? total / filteredData.length : 0)}
        />
      </div>

      <div className="panel p-5">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Chi phí theo tháng</p>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Job ID</th>
              <th className="px-4 py-3 text-left font-medium">Ký tự</th>
              <th className="px-4 py-3 text-left font-medium">Tháng</th>
              <th className="px-4 py-3 text-left font-medium">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-300">
                  Chưa có bản ghi
                </td>
              </tr>
            )}
            {filteredData.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-800/70">
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-100">{r.jobId}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatNumber(r.charCount)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.month}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatAmount(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
