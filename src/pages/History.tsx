import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../services/api";
import { useStore } from "../store/useStore";
import { useToast } from "../components/Toast";
import AdBanner from "../components/AdBanner";
import type { AudioRecord } from "../types";
import { Play, Pause, Download, Trash2, Search, Clock, Mic2, Zap } from "lucide-react";

export default function History() {
  const { audioHistory, setAudioHistory } = useStore();
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    apiFetch("/api/history").then((d) => setAudioHistory(d.history)).catch((e) => toast(e.message, "error")).finally(() => setLoading(false));
  }, [setAudioHistory, toast]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const filtered = useMemo(() => audioHistory.filter((h) => h.text.toLowerCase().includes(debouncedSearch.toLowerCase())), [audioHistory, debouncedSearch]);

  const stats = useMemo(() => ({
    total: audioHistory.length,
    duration: audioHistory.reduce((a, h) => a + (h.duration || 0), 0),
    credits: audioHistory.length * 100,
  }), [audioHistory]);

  const handlePlay = useCallback(async (id: string) => {
    if (playingId === id) { audioRef.current?.pause(); audioRef.current = null; setPlayingId(null); return; }
    try {
      const res = await apiFetch(`/api/history/${id}/audio`, {}, true);
      const blob = new Blob([await res.arrayBuffer()], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url); audioRef.current = audio; setPlayingId(id);
      audio.play(); audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
    } catch { toast("Play failed", "error"); }
  }, [playingId, toast]);

  const handleDownload = useCallback(async (id: string, voice: string) => {
    try {
      const res = await apiFetch(`/api/history/${id}/audio`, {}, true);
      const blob = new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `awaz-${voice}-${id.slice(0, 8)}.mp3`; a.click();
      toast("Downloaded", "success");
    } catch { toast("Download failed", "error"); }
  }, [toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/history/${id}`, { method: "DELETE" });
      setAudioHistory(audioHistory.filter((h) => h.id !== id));
      if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
      toast("Deleted", "info");
    } catch (e: any) { toast(e.message, "error"); }
  }, [audioHistory, setAudioHistory, playingId, toast]);

  const fmtDate = (d: string) => new Date(d + "Z").toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">History</h1>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input !pl-9 !py-2 !text-[13px]" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Mic2, label: "Total", value: stats.total },
          { icon: Clock, label: "Duration", value: fmtDur(stats.duration) },
          { icon: Zap, label: "Credits", value: stats.credits.toLocaleString() },
        ].map((s, i) => (
          <div key={i} className="glass p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-glow flex items-center justify-center flex-shrink-0">
              <s.icon size={14} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{s.value}</p>
              <p className="text-[9px] text-text-muted uppercase tracking-wider truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass p-3 flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5"><div className="skeleton h-3.5 w-3/4 rounded" /><div className="skeleton h-2.5 w-1/3 rounded" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14">
          <div className="mx-auto w-16 h-16 rounded-full border-2 border-border flex items-center justify-center mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-border" /></div>
          </div>
          <h3 className="text-[15px] font-semibold mb-1">{search ? "No results" : "No audio yet"}</h3>
          <p className="text-[12px] text-text-secondary">{search ? "Try different search" : "Generate your first speech"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -80 }}
                className={`glass p-3 flex items-center gap-3 group transition-all hover:border-border-active ${playingId === item.id ? "!border-accent/25 bg-accent-glow/20" : ""}`}>
                <button onClick={() => handlePlay(item.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${playingId === item.id ? "bg-gradient-to-br from-accent to-accent-light shadow shadow-accent/20" : "bg-bg-elevated"
                    }`}>
                  {playingId === item.id ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-text-secondary ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] line-clamp-1 leading-relaxed" dir="auto">{item.text}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-accent font-medium bg-accent-glow px-1.5 py-0.5 rounded-full capitalize">{item.voice}</span>
                    <span className="text-[10px] text-text-muted">{fmtDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => handleDownload(item.id, item.voice)} className="btn-icon !min-w-[36px] !min-h-[36px]"><Download size={15} /></button>
                  <button onClick={() => handleDelete(item.id)} className="btn-icon !min-w-[36px] !min-h-[36px] hover:!text-error"><Trash2 size={15} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Ad slot */}
      <AdBanner slot="history-bottom" />
    </div>
  );
}
