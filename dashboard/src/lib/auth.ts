const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
const STORAGE_KEY = "tts_auth_session_v1";

type SessionUser = {
  id: string;
  email: string;
  tenantId?: string;
  role?: "member";
  isSuperAdmin?: boolean;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

function hasWindow() {
  return typeof window !== "undefined";
}

export function getSession(): AuthSession | null {
  if (!hasWindow()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (!hasWindow()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (!hasWindow()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function getCurrentUser(): SessionUser | null {
  return getSession()?.user ?? null;
}

export async function refreshSession(): Promise<boolean> {
  const session = getSession();
  if (!session?.refreshToken) return false;
  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!res.ok) {
    clearSession();
    return false;
  }
  const next = (await res.json()) as AuthSession;
  setSession(next);
  return true;
}

export async function ensureSession(): Promise<boolean> {
  const session = getSession();
  if (session?.accessToken) return true;
  return refreshSession();
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const session = getSession();
  if (!session?.accessToken) {
    throw new Error("UNAUTHENTICATED");
  }
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  if (!refreshed) return res;

  const renewed = getSession();
  const retryHeaders = new Headers(init?.headers ?? {});
  retryHeaders.set("Authorization", `Bearer ${renewed?.accessToken ?? ""}`);
  res = await fetch(input, { ...init, headers: retryHeaders });
  return res;
}

export async function logout(): Promise<void> {
  const session = getSession();
  if (session?.refreshToken) {
    await fetch(`${API_BASE}/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => undefined);
  }
  clearSession();
}

