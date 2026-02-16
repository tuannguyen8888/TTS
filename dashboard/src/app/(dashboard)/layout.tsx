"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ensureSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSession().then((ok) => {
      if (!ok) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-300">
        Đang xác thực phiên làm việc...
      </main>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
