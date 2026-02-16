"use client";

import { useEffect, useState } from "react";
import { fetchAdminOverview, fetchAdminTenants, fetchAdminUsers } from "@/lib/api";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/format";

type Overview = {
  totalTenants: number;
  totalUsers: number;
  totalJobs: number;
  activeApiKeys: number;
  totalChars: number;
  totalRevenueEstimate: number;
};

export default function SystemAdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string; isSuperAdmin: boolean }>>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAdminOverview(), fetchAdminTenants(), fetchAdminUsers()])
      .then(([o, t, u]) => {
        setOverview(o);
        setTenants(t);
        setUsers(u);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
        Lỗi: {err}
      </p>
    );
  }
  if (!overview) return <p className="text-sm text-slate-500">Đang tải dữ liệu hệ thống...</p>;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="System Admin"
        description="Giám sát toàn bộ tenant, user và trạng thái vận hành của nền tảng."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng tenant" value={formatNumber(overview.totalTenants)} />
        <StatCard label="Tổng user" value={formatNumber(overview.totalUsers)} />
        <StatCard label="Tổng TTS jobs" value={formatNumber(overview.totalJobs)} />
        <StatCard label="API keys active" value={formatNumber(overview.activeApiKeys)} />
        <StatCard label="Tổng ký tự" value={formatNumber(overview.totalChars)} />
        <StatCard
          label="Tổng doanh thu ước tính"
          value={overview.totalRevenueEstimate.toLocaleString("vi-VN", {
            style: "currency",
            currency: "USD",
          })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Tenants gần đây</p>
          <div className="space-y-2">
            {tenants.slice(0, 12).map((tenant) => (
              <div key={tenant.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <p className="font-medium text-slate-800 dark:text-slate-100">{tenant.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {tenant.id} · {tenant.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Users gần đây</p>
          <div className="space-y-2">
            {users.slice(0, 12).map((user) => (
              <div key={user.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <p className="font-medium text-slate-800 dark:text-slate-100">{user.email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {user.id} · {user.isSuperAdmin ? "super_admin" : "tenant_user"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

