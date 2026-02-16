"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchUsageSummary } from "@/lib/api";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/format";

export default function HomePage() {
  const [summary, setSummary] = useState<{
    totalRequests?: number;
    totalChars?: number;
    byStatus?: Record<string, number>;
  }>({ totalRequests: 0, totalChars: 0, byStatus: {} });

  useEffect(() => {
    fetchUsageSummary()
      .then(setSummary)
      .catch(() => {
        setSummary({ totalRequests: 0, totalChars: 0, byStatus: {} });
      });
  }, []);

  const success = Number(summary.byStatus?.completed ?? 0);
  const failed = Number(summary.byStatus?.failed ?? 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tổng quan hệ thống"
        description="Theo dõi nhanh tình trạng sử dụng dịch vụ và truy cập nhanh các tác vụ quan trọng."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Requests" value={formatNumber(summary.totalRequests ?? 0)} />
        <StatCard label="Total Characters" value={formatNumber(summary.totalChars ?? 0)} />
        <StatCard label="Completed" value={formatNumber(success)} tone="success" />
        <StatCard label="Failed" value={formatNumber(failed)} tone="danger" />
      </div>

      <div className="panel p-5">
        <p className="mb-3 text-sm font-medium text-slate-700">Tác vụ nhanh</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/usage"
            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
          >
            Xem Usage
          </Link>
          <Link
            href="/transactions"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Xem Transactions
          </Link>
          <Link
            href="/billing"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Xem Billing
          </Link>
          <Link
            href="/api-keys"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Quản lý API Keys
          </Link>
        </div>
      </div>
    </div>
  );
}
