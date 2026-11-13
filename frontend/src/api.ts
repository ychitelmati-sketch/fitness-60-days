/// <reference types="vite/client" />

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");

type TelegramWebApp = { initData?: string; ready?: () => void; expand?: () => void };
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export async function authenticateTelegram(): Promise<string | null> {
  const webApp = window.Telegram?.WebApp;
  webApp?.ready?.();
  webApp?.expand?.();
  const initData = webApp?.initData;
  if (!initData) return null;

  const response = await fetch(`${API_URL}/api/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ init_data: initData }),
  });
  if (!response.ok) throw new Error("Telegram auth failed");
  const data = await response.json();
  return data.access_token as string;
}

export async function loadRemoteState(token: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_URL}/api/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Could not load tracker state");
  const data = await response.json();
  return (data.state || {}) as Record<string, unknown>;
}

export async function saveRemoteState(token: string, state: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_URL}/api/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ state }),
  });
  if (!response.ok) throw new Error("Could not save tracker state");
}
