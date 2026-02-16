"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const session = await login({ email, password });
      setSession(session);
      router.push("/");
    } catch {
      setErr("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Đăng nhập Console</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Truy cập hệ thống điều phối TTS và theo dõi dữ liệu AI theo thời gian thực.
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
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="w-full rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-400"
        />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-70"
        >
          {submitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-cyan-600 hover:underline dark:text-cyan-300">
          Quên mật khẩu?
        </Link>
        <Link href="/register" className="text-cyan-600 hover:underline dark:text-cyan-300">
          Tạo tài khoản mới
        </Link>
      </div>
    </div>
  );
}

