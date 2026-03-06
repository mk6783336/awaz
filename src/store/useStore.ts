import { create } from "zustand";
import type { User, AudioRecord } from "../types";

// ── localStorage helpers ────────────────────────────
function loadSaved(): { user: User | null; token: string | null } {
  try {
    const raw = localStorage.getItem("awaz_auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token && parsed?.user) return parsed;
    }
  } catch { /* ignore corrupt data */ }
  return { user: null, token: null };
}

function saveAuth(user: User | null, token: string | null) {
  try {
    if (user && token) {
      localStorage.setItem("awaz_auth", JSON.stringify({ user, token }));
    } else {
      localStorage.removeItem("awaz_auth");
    }
  } catch { /* storage full or unavailable */ }
}

// ── Store ───────────────────────────────────────────
interface AppState {
  user: User | null;
  token: string | null;
  audioHistory: AudioRecord[];
  ready: boolean;
  setUser: (user: User, token: string) => void;
  clearUser: () => void;
  updateCredits: (credits: number) => void;
  updateUser: (user: Partial<User>) => void;
  setAudioHistory: (history: AudioRecord[]) => void;
  setReady: () => void;
}

const saved = loadSaved();

export const useStore = create<AppState>((set) => ({
  user: saved.user,
  token: saved.token,
  audioHistory: [],
  ready: false,
  setUser: (user, token) => {
    saveAuth(user, token);
    set({ user, token });
  },
  clearUser: () => {
    saveAuth(null, null);
    set({ user: null, token: null, audioHistory: [] });
  },
  updateCredits: (credits) =>
    set((s) => {
      if (!s.user) return {};
      const updated = { ...s.user, credits };
      saveAuth(updated, s.token);
      return { user: updated };
    }),
  updateUser: (partial) =>
    set((s) => {
      if (!s.user) return {};
      const updated = { ...s.user, ...partial };
      saveAuth(updated, s.token);
      return { user: updated };
    }),
  setAudioHistory: (audioHistory) => set({ audioHistory }),
  setReady: () => set({ ready: true }),
}));
