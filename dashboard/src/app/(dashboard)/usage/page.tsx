"use client";

import { useEffect, useState } from "react";
import { fetchUsageSummary } from "@/lib/api";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/format";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";

export default function UsagePage() {
  const [data, setData] = useState<{
    totalRequests?: number;
    totalChars?: number;
    byStatus?: Record<string, number>;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  useEffect(() => {
    fetchUsageSummary(range.from, range.to)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [range.from, range.to]);

  if (err) return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Lỗi: {err}</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }
  const success = Number(data.byStatus?.completed ?? 0);
  const failed = Number(data.byStatus?.failed ?? 0);
  const total = Math.max((data.totalRequests ?? 0), 1);
  const successPct = Math.round((success / total) * 100);
  const failedPct = Math.round((failed / total) * 100);
  const chartData = [
    { name: "Completed", value: success, color: "#10b981" },
    { name: "Failed", value: failed, color: "#f43f5e" },
  ].filter((v) => v.value > 0);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Usage Summary"
        description="Theo dõi mức sử dụng dịch vụ theo thời gian thực và chất lượng xử lý request."
        rightSlot={
          <DateRangeFilter
            initialFrom={range.from}
            initialTo={range.to}
            onApply={(next) => {
              setErr(null);
              setData(null);
              setRange(next);
            }}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Tổng request" value={formatNumber(data.totalRequests ?? 0)} />
        <StatCard label="Tổng ký tự" value={formatNumber(data.totalChars ?? 0)} />
        <StatCard label="Completed" value={formatNumber(success)} tone="success" />
        <StatCard label="Failed" value={formatNumber(failed)} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <p className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-200">Tỷ lệ trạng thái</p>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Completed</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{successPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${successPct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Failed</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{failedPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${failedPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Phân bố trạng thái</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.length ? chartData : [{ name: "No Data", value: 1, color: "#cbd5e1" }]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {(chartData.length ? chartData : [{ color: "#cbd5e1" }]).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
