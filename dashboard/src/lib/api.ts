import { authFetch } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export async function fetchUsageSummary(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await authFetch(`${API_BASE}/v1/usage/summary?${params}`);
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}

export async function fetchTransactions(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await authFetch(`${API_BASE}/v1/usage/transactions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchBillingLedger(month?: string) {
  const params = month ? `?month=${month}` : "";
  const res = await authFetch(`${API_BASE}/v1/billing/ledger${params}`);
  if (!res.ok) throw new Error("Failed to fetch ledger");
  return res.json();
}

export async function fetchApiKeys() {
  const res = await authFetch(`${API_BASE}/v1/api-keys`);
  if (!res.ok) throw new Error("Failed to fetch api keys");
  return res.json();
}

export async function createApiKey() {
  const res = await authFetch(`${API_BASE}/v1/api-keys`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create api key");
  return res.json();
}

export async function revokeApiKey(id: string) {
  const res = await authFetch(`${API_BASE}/v1/api-keys/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to revoke api key");
  return res.json();
}

export async function register(payload: {
  email: string;
  password: string;
  tenantName: string;
}) {
  const res = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to register");
  return res.json();
}

export async function login(payload: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to login");
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to request password reset");
  return res.json();
}

export async function resetPassword(payload: {
  email: string;
  token: string;
  newPassword: string;
}) {
  const res = await fetch(`${API_BASE}/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to reset password");
  return res.json();
}

export async function fetchMe() {
  const res = await authFetch(`${API_BASE}/v1/auth/me`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function fetchAdminOverview() {
  const res = await authFetch(`${API_BASE}/v1/admin/overview`);
  if (!res.ok) throw new Error("Failed to fetch admin overview");
  return res.json();
}

export async function fetchAdminTenants() {
  const res = await authFetch(`${API_BASE}/v1/admin/tenants`);
  if (!res.ok) throw new Error("Failed to fetch tenants");
  return res.json();
}

export async function fetchAdminUsers() {
  const res = await authFetch(`${API_BASE}/v1/admin/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}
