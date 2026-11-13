/// <reference types="vite/client" />

type CloudStorage = {
  getItems: (keys: string[], callback: (error: string | null, values: Record<string, string>) => void) => void;
  setItem: (key: string, value: string, callback?: (error: string | null, stored: boolean) => void) => void;
  removeItem: (key: string, callback?: (error: string | null, removed: boolean) => void) => void;
};

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  CloudStorage?: CloudStorage;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export type RemoteState = {
  completed_days: number[];
  notes: Record<number, string>;
  started_at: string;
  has_stored_data: boolean;
};

const PREFIX = "form60_";
const KEYS = [
  PREFIX + "completed",
  PREFIX + "started",
  ...Array.from({ length: 60 }, (_, i) => PREFIX + "note_" + (i + 1)),
];

function getCloudStorage(): CloudStorage | null {
  const app = window.Telegram?.WebApp;
  app?.ready?.();
  app?.expand?.();
  if (!app?.CloudStorage || (app.isVersionAtLeast && !app.isVersionAtLeast("6.9"))) return null;
  return app.CloudStorage;
}

function getItems(storage: CloudStorage, keys: string[]): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    storage.getItems(keys, (error, values) => {
      if (error) reject(new Error(error));
      else resolve(values || {});
    });
  });
}

function setItem(storage: CloudStorage, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.setItem(key, value, (error, stored) => {
      if (error || stored === false) reject(new Error(error || "Telegram CloudStorage write failed"));
      else resolve();
    });
  });
}

function removeItem(storage: CloudStorage, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.removeItem(key, (error, removed) => {
      if (error || removed === false) reject(new Error(error || "Telegram CloudStorage remove failed"));
      else resolve();
    });
  });
}

export async function loadCloudState(): Promise<RemoteState | null> {
  const storage = getCloudStorage();
  if (!storage) return null;
  const values = await getItems(storage, KEYS);
  let completed: number[] = [];
  try {
    const parsed = JSON.parse(values[PREFIX + "completed"] || "[]");
    if (Array.isArray(parsed)) completed = parsed.filter((day: unknown) => Number.isInteger(day) && Number(day) >= 1 && Number(day) <= 60);
  } catch { /* Ignore invalid stored progress. */ }

  const notes: Record<number, string> = {};
  for (let day = 1; day <= 60; day++) {
    const value = values[PREFIX + "note_" + day];
    if (typeof value === "string" && value) notes[day] = value.slice(0, 500);
  }

  return {
    completed_days: completed,
    notes,
    started_at: values[PREFIX + "started"] || new Date().toISOString(),
    has_stored_data: Boolean(values[PREFIX + "completed"] || values[PREFIX + "started"] || Object.keys(notes).length),
  };
}

export async function saveCloudState(state: RemoteState): Promise<void> {
  const storage = getCloudStorage();
  if (!storage) throw new Error("Telegram CloudStorage is unavailable");

  const values: Record<string, string> = {
    [PREFIX + "completed"]: JSON.stringify(state.completed_days),
    [PREFIX + "started"]: state.started_at,
  };
  for (let day = 1; day <= 60; day++) {
    const note = state.notes[day] || "";
    if (note) values[PREFIX + "note_" + day] = note.slice(0, 500);
  }

  const existing = await getItems(storage, KEYS);
  const operations = Object.entries(values)
    .filter(([key, value]) => existing[key] !== value)
    .map(([key, value]) => setItem(storage, key, value));

  for (let day = 1; day <= 60; day++) {
    const key = PREFIX + "note_" + day;
    if (!values[key] && existing[key]) operations.push(removeItem(storage, key));
  }
  await Promise.all(operations);
}
