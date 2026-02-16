"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getCurrentUser, logout } from "@/lib/auth";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const items = currentUser?.isSuperAdmin
    ? [{ href: "/system-admin", label: "System Admin" }]
    : [
        { href: "/", label: "Tổng quan" },
        { href: "/usage", label: "Usage" },
        { href: "/transactions", label: "Transactions" },
        { href: "/billing", label: "Billing" },
        { href: "/api-keys", label: "API Keys" },
      ];

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 p-4 lg:p-6">
        <aside className="panel sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 p-4 lg:block">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              TTS
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">TTS Dashboard</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Tenant Console</p>
          </div>

          <nav className="flex flex-col gap-1.5">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Môi trường</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Production-ready MVP</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="panel flex items-center justify-between px-5 py-4">
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {currentUser?.isSuperAdmin
                  ? "Quản trị toàn hệ thống"
                  : "Quản lý dịch vụ TTS"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                {currentUser?.isSuperAdmin
                  ? "Giám sát tenant, người dùng và tổng quan nền tảng"
                  : "Theo dõi usage, billing và API keys theo thời gian thực"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 md:block">
                {currentUser?.email ?? "Unknown user"}
              </div>
              <ThemeToggle />
              <button
                onClick={() => {
                  logout().finally(() => router.replace("/login"));
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Đăng xuất
              </button>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {new Date().toLocaleString("vi-VN")}
              </div>
            </div>
          </header>

          <nav className="panel flex gap-2 overflow-x-auto p-2 lg:hidden">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="panel min-h-[calc(100vh-9rem)] p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
