"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const search = useSearchParams();
  const defaultEmail = useMemo(() => search.get("email") ?? "", [search]);
  const defaultToken = useMemo(() => search.get("token") ?? "", [search]);

  const [email, setEmail] = useState(defaultEmail);
  const [token, setToken] = useState(defaultToken);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await resetPassword({ email, token, newPassword });
      setMessage("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.");
    } catch {
      setErr("Token không hợp lệ hoặc đã hết hạn.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Xác thực token và cập nhật mật khẩu mới cho tài khoản.
        </p>
      </div>

      <form className="space-y-3.5" onSubmit={submit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-400"
        />
        <textarea
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Reset token"
          className="min-h-24 w-full rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-400"
        />
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mật khẩu mới (>= 8 ký tự)"
          className="w-full rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-400"
        />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-70"
        >
          {submitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
        </button>
      </form>

      <p className="text-sm text-slate-500 dark:text-slate-300">
        <Link href="/login" className="text-cyan-600 hover:underline dark:text-cyan-300">
          Quay về đăng nhập
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Đang tải form đặt lại mật khẩu...
        </p>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

