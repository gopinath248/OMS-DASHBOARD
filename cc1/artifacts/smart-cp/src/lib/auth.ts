export type AuthRole = "ADMIN" | "EMPLOYEE" | "INTERN" | "HR" | "MANAGER";
export type NavigationRole = "admin" | "employee" | "intern" | "hr" | "manager";

export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: AuthRole;
  status: "Active" | "Inactive";
  avatarUrl?: string | null;
  designation?: string;
  mustChangePassword?: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

type LoginPayload =
  | {
      token?: string;
      error?: string;
      message?: string;
      user?: AuthUser;
    }
  | null;

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const LEGACY_ROLE_KEY = "role";
export const AUTH_SESSION_CHANGED_EVENT = "planway-auth-session-changed";

function emitAuthSessionChanged(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

function notifyLogout(token: string | null): void {
  if (!token) return;
  fetch("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => undefined);
}

export function normalizeAuthRole(role: unknown): AuthRole | null {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case "ADMIN":
    case "EMPLOYEE":
    case "INTERN":
    case "HR":
    case "MANAGER":
      return normalized;
    case "TRAINEE":
    case "STUDENT":
      return "INTERN";
    default:
      return null;
  }
}

export function roleToDashboardPath(role: unknown): string {
  const normalizedRole = normalizeAuthRole(role);

  switch (normalizedRole) {
    case "ADMIN":
      return "/admin/dashboard";
    case "EMPLOYEE":
      return "/employee/dashboard";
    case "INTERN":
      return "/intern/dashboard";
    case "HR":
      return "/hr/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    default:
      return "/login";
  }
}

export function roleToNavigationRole(role: unknown): NavigationRole {
  const normalizedRole = normalizeAuthRole(role);

  switch (normalizedRole) {
    case "ADMIN":
      return "admin";
    case "EMPLOYEE":
      return "employee";
    case "INTERN":
      return "intern";
    case "HR":
      return "hr";
    case "MANAGER":
      return "manager";
    default:
      return "intern";
  }
}

export function formatRole(role: AuthRole | NavigationRole): string {
  return role
    .toLowerCase()
    .split("_")
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function isTokenExpired(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = JSON.parse(window.atob(paddedBase64)) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function clearAuthSession(): void {
  const token = localStorage.getItem(TOKEN_KEY);
  const changed =
    token !== null ||
    localStorage.getItem(USER_KEY) !== null ||
    localStorage.getItem(LEGACY_ROLE_KEY) !== null;

  if (changed) notifyLogout(token);

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_ROLE_KEY);

  if (changed) {
    emitAuthSessionChanged();
  }
}

export function saveAuthSession(session: AuthSession): void {
  const nextUserJson = JSON.stringify(session.user);
  const nextRole = roleToNavigationRole(session.user.role);
  const changed =
    localStorage.getItem(TOKEN_KEY) !== session.token ||
    localStorage.getItem(USER_KEY) !== nextUserJson ||
    localStorage.getItem(LEGACY_ROLE_KEY) !== nextRole;

  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, nextUserJson);
  localStorage.setItem(LEGACY_ROLE_KEY, nextRole);

  if (changed) {
    emitAuthSessionChanged();
  }
}

export function getAuthSession(): AuthSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);

  if (!token || !userJson || isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }

  try {
    const user = JSON.parse(userJson) as AuthUser;
    const role = normalizeAuthRole(user.role);

    if (!role) {
      clearAuthSession();
      return null;
    }

    return { token, user: { ...user, role } };
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function validateAuthSession(): Promise<AuthSession | null> {
  const session = getAuthSession();
  if (!session) return null;

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  }).catch(() => null);

  if (!response) {
    return session;
  }

  if (response.status === 401 || response.status === 403) {
    clearAuthSession();
    return null;
  }

  if (!response.ok) {
    return session;
  }

  const user = (await response.json()) as AuthUser;
  const role = normalizeAuthRole(user.role);
  if (!role) {
    clearAuthSession();
    return null;
  }

  const validatedSession = { token: session.token, user: { ...user, role } };
  saveAuthSession(validatedSession);
  return validatedSession;
}

export async function loginWithCredentials(userId: string, password: string): Promise<AuthSession> {
  const normalizedUserId = userId.trim().toUpperCase();
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ userId: normalizedUserId, password }),
  }).catch(() => null);

  if (!response) {
    throw new Error("Unable to connect to the backend. Please try again.");
  }

  const payload = (await response.json().catch(() => null)) as LoginPayload;

  if (!response.ok || !payload?.token || !payload.user) {
    throw new Error(payload?.message ?? payload?.error ?? "Invalid User ID or password.");
  }

  const role = normalizeAuthRole(payload.user.role);
  if (!role) {
    clearAuthSession();
    throw new Error("Your account role is not supported by this application.");
  }

  const session = { token: payload.token, user: { ...payload.user, role } };
  saveAuthSession(session);
  return session;
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  const session = getAuthSession();
  if (!session) throw new Error("Your session has expired. Please log in again.");

  const response = await fetch("/api/auth/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).catch(() => null);

  if (!response) {
    throw new Error("Unable to connect to the backend. Please try again.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? "Unable to update password.");
  }
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const session = getAuthSession();
  if (!session) throw new Error("Your session has expired. Please log in again.");

  const formData = new FormData();
  formData.set("avatar", file);

  const response = await fetch("/api/auth/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
    body: formData,
  }).catch(() => null);

  if (!response) {
    throw new Error("Unable to connect to the backend. Please try again.");
  }

  const payload = (await response.json().catch(() => null)) as { user?: AuthUser; error?: string; message?: string } | null;
  if (!response.ok || !payload?.user) {
    throw new Error(payload?.message ?? payload?.error ?? "Unable to upload avatar.");
  }

  const role = normalizeAuthRole(payload.user.role);
  if (!role) {
    throw new Error("Your account role is not supported by this application.");
  }

  const user = { ...payload.user, role };
  saveAuthSession({ token: session.token, user });
  return user;
}

export async function removeAvatar(): Promise<AuthUser> {
  const session = getAuthSession();
  if (!session) throw new Error("Your session has expired. Please log in again.");

  const response = await fetch("/api/auth/avatar", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  }).catch(() => null);

  if (!response) {
    throw new Error("Unable to connect to the backend. Please try again.");
  }

  const payload = (await response.json().catch(() => null)) as { user?: AuthUser; error?: string; message?: string } | null;
  if (!response.ok || !payload?.user) {
    throw new Error(payload?.message ?? payload?.error ?? "Unable to remove avatar.");
  }

  const role = normalizeAuthRole(payload.user.role);
  if (!role) {
    throw new Error("Your account role is not supported by this application.");
  }

  const user = { ...payload.user, role };
  saveAuthSession({ token: session.token, user });
  return user;
}
