import { create } from "zustand";
import type { User, AudioRecord } from "../types";

interface AppState {
  user: User | null;
  token: string | null;
  audioHistory: AudioRecord[];
  setUser: (user: User, token: string) => void;
  clearUser: () => void;
  updateCredits: (credits: number) => void;
  updateUser: (user: Partial<User>) => void;
  setAudioHistory: (history: AudioRecord[]) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: null,
  audioHistory: [],
  setUser: (user, token) => set({ user, token }),
  clearUser: () => set({ user: null, token: null, audioHistory: [] }),
  updateCredits: (credits) =>
    set((s) => (s.user ? { user: { ...s.user, credits } } : {})),
  updateUser: (partial) =>
    set((s) => (s.user ? { user: { ...s.user, ...partial } } : {})),
  setAudioHistory: (audioHistory) => set({ audioHistory }),
}));
