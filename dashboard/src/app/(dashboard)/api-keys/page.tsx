"use client";

import { useEffect, useState } from "react";
import { fetchApiKeys, createApiKey, revokeApiKey } from "@/lib/api";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime, formatNumber } from "@/lib/format";

type Key = { id: string; keyPrefix: string; status: string; createdAt: string };

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const keysData = await fetchApiKeys();
    setKeys(keysData);
  };

  useEffect(() => {
    load()
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = () => {
    setErr(null);
    createApiKey()
      .then((r: { id: string; key: string }) => {
        setNewKey(r.key);
        return load();
      })
      .catch((e) => setErr(e.message));
  };

  const handleRevoke = (id: string) => {
    setErr(null);
    revokeApiKey(id)
      .then(() => load())
      .catch((e) => setErr(e.message));
  };

  if (err) return <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Lỗi: {err}</p>;
  if (loading) return <p className="text-sm text-slate-500">Đang tải danh sách API keys...</p>;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="API Keys"
        description="Quản lý key tích hợp cho từng tenant. Key mới chỉ hiển thị một lần để đảm bảo bảo mật."
      />

      {newKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">API key mới (chỉ hiển thị 1 lần):</p>
          <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-sm">{newKey}</code>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => navigator.clipboard?.writeText(newKey)}
              className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="text-sm text-amber-700 hover:underline"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Tổng key: {formatNumber(keys.length)}</p>
        <button
          onClick={handleCreate}
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium shadow-sm"
        >
          Tạo API key mới
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Prefix</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-left font-medium">Tạo lúc</th>
              <th className="px-4 py-3 text-left font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  Chưa có API key
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-slate-700">{k.keyPrefix}...</td>
                <td className="px-4 py-3">
                  <StatusPill status={k.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(k.createdAt)}</td>
                <td className="px-4 py-3">
                  {k.status === "active" && (
                    <button
                      onClick={() => {
                        if (window.confirm("Bạn chắc chắn muốn revoke key này?")) {
                          handleRevoke(k.id);
                        }
                      }}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
