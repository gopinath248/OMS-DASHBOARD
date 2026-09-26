import { getAuthSession } from "@/lib/auth";
import {
  markAllCachedNotificationsRead,
  markCachedNotificationRead,
  replaceAppData,
  type AppData,
} from "@/data/mockData";

export const APP_DATA_UPDATED_EVENT = "planway-app-data-updated";

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

export async function refreshAppData() {
  const data = await apiJson<AppData>("/app-data");
  replaceAppData(data);
  window.dispatchEvent(new Event(APP_DATA_UPDATED_EVENT));
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  markCachedNotificationRead(id);
  window.dispatchEvent(new Event(APP_DATA_UPDATED_EVENT));
  await apiJson<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
  await refreshAppData();
}

export async function markAllNotificationsRead(): Promise<void> {
  markAllCachedNotificationsRead();
  window.dispatchEvent(new Event(APP_DATA_UPDATED_EVENT));
  await apiJson<void>("/notifications/read-all", { method: "PATCH" });
  await refreshAppData();
}

export async function deleteNotification(id: string): Promise<void> {
  await apiJson<void>(`/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
  await refreshAppData();
}
