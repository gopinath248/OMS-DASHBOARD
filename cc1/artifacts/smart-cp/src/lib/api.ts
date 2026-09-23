import { getAuthSession } from "@/lib/auth";

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getAuthSession();
  if (!session) throw new Error("Your session has expired. Please log in again.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  const response = await fetch(`/api${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? "Request failed.");
  }

  return payload as T;
}

export function markNotificationRead(id: string): Promise<void> {
  return apiJson<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiJson<void>("/notifications/read-all", { method: "PATCH" });
}
