"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setMessage(
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
      );
    } catch {
      setErr("Không thể gửi yêu cầu lúc này. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Nhập email để hệ thống AI Security gửi link đặt lại qua SMTP.
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
        {err && <p className="text-sm text-rose-600">{err}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-70"
        >
          {submitting ? "Đang xử lý..." : "Gửi link đặt lại"}
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

