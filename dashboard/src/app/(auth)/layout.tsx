export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.2),transparent_45%),radial-gradient(ellipse_at_bottom,_rgba(59,130,246,0.2),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:bg-slate-900/80">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              TTS Console
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              AI Voice Platform
            </p>
          </div>
          <div className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            Secure
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

