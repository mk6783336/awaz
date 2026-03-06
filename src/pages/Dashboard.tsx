import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "../store/useStore";
import { apiFetch } from "../services/api";
import { generateSpeech } from "../services/ttsService";
import { useToast } from "../components/Toast";
import AdBanner from "../components/AdBanner";
import { Play, Pause, Download, Loader2, Sparkles, ChevronDown, ChevronUp, Volume2, Mic, Zap } from "lucide-react";

const VOICES = [
  { id: "ayesha", name: "Ayesha", gender: "F", color: "from-pink-500 to-rose-500" },
  { id: "bilal", name: "Bilal", gender: "M", color: "from-blue-500 to-indigo-500" },
  { id: "tariq", name: "Tariq", gender: "M", color: "from-emerald-500 to-teal-500" },
  { id: "zain", name: "Zain", gender: "M", color: "from-violet-500 to-purple-500" },
  { id: "fatima", name: "Fatima", gender: "F", color: "from-amber-500 to-orange-500" },
];
const SPEEDS = ["Slow", "Normal", "Fast"];
const PITCHES = ["Low", "Normal", "High"];
const STYLES = ["Neutral", "Happy", "Serious", "Dramatic", "Energetic", "Whisper"];
const EXAMPLES = [
  "آج موسم بہت خوشگوار ہے۔",
  "پاکستان ایک خوبصورت ملک ہے۔",
  "السلام علیکم! تازہ ترین خبریں سنیے۔",
];

export default function Dashboard() {
  const { user } = useStore();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("bilal");
  const [speed, setSpeed] = useState("Normal");
  const [pitch, setPitch] = useState("Normal");
  const [style, setStyle] = useState("Neutral");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); if (timerRef.current) clearInterval(timerRef.current); }, [audioUrl]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) { toast("Enter some Urdu text first", "error"); return; }
    setGenerating(true); setAudioUrl(null); setAudioBlob(null);
    try {
      const r = await generateSpeech({ text, voiceName: voice, speed, pitch, style });
      setAudioUrl(r.audioUrl); setAudioBlob(r.audioBlob); setDuration(r.duration);
      toast("Audio generated!", "success");
    } catch (err: any) { toast(err.message, "error"); }
    finally { setGenerating(false); }
  }, [text, voice, speed, pitch, style, toast]);

  const handleScript = useCallback(async () => {
    if (!scriptPrompt.trim()) return;
    setScriptLoading(true);
    try {
      const d = await apiFetch("/api/generate-script", { method: "POST", body: JSON.stringify({ prompt: scriptPrompt }) });
      setText(d.text); setShowScript(false); setScriptPrompt(""); toast("Script generated!", "success");
    } catch (err: any) { toast(err.message, "error"); } finally { setScriptLoading(false); }
  }, [scriptPrompt, toast]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); if (timerRef.current) clearInterval(timerRef.current); }
    else { audioRef.current.play(); timerRef.current = window.setInterval(() => { if (audioRef.current) { setCurrentTime(audioRef.current.currentTime); setDuration(audioRef.current.duration || 0); } }, 80); }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleEnd = useCallback(() => { setIsPlaying(false); setCurrentTime(0); if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleDownload = useCallback(() => {
    if (!audioBlob) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(audioBlob); a.download = `awaz-${voice}-${Date.now()}.mp3`; a.click(); toast("Downloaded", "success");
  }, [audioBlob, voice, toast]);

  const fmt = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">TTS Studio</h1>
          <p className="text-[12px] text-text-secondary mt-0.5 hidden sm:block">Transform Urdu text into natural speech</p>
        </div>
        <div className="glass px-3 py-1.5 flex items-center gap-1.5 flex-shrink-0">
          <Zap size={12} className="text-accent" />
          <span className="text-[13px] font-bold text-accent">{user?.credits?.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ═══ LEFT: TEXT ═══ */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold flex items-center gap-1.5"><Mic size={14} className="text-accent" /> Urdu Text</label>
              <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${text.length > 900 ? "text-error bg-error/10" : text.length > 0 ? "text-accent bg-accent-glow" : "text-text-muted bg-bg-elevated"}`}>{text.length}/1000</span>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder="...یہاں اردو متن لکھیں" dir="auto" rows={5} className="input !text-[15px] md:!text-[16px] !leading-[1.6]" style={{ minHeight: 140 }} />
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
              {EXAMPLES.map((ex, i) => (<button key={i} onClick={() => setText(ex)} className="chip !text-[10px] !py-1 !px-2.5 flex-shrink-0">{ex.slice(0, 25)}...</button>))}
            </div>
            <div>
              <button onClick={() => setShowScript(!showScript)} className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-light transition-colors">
                <Sparkles size={14} /> AI Script Writer
              </button>
              <AnimatePresence>
                {showScript && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2">
                    <div className="flex gap-2">
                      <input value={scriptPrompt} onChange={(e) => setScriptPrompt(e.target.value)} placeholder="e.g., 'cricket news'" className="input flex-1 !text-[13px]" onKeyDown={(e) => e.key === "Enter" && handleScript()} />
                      <button onClick={handleScript} disabled={scriptLoading || !scriptPrompt.trim()} className="btn-primary !px-4 flex-shrink-0">
                        {scriptLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: VOICE + CONTROLS ═══ */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-4 md:p-5 space-y-4">
            <label className="text-[13px] font-semibold">Choose Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {VOICES.map((v) => (
                <button key={v.id} onClick={() => setVoice(v.id)} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${voice === v.id ? "border-accent/40 bg-accent-glow" : "border-border hover:border-border-active"}`}>
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${v.color} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0`}>{v.name[0]}</div>
                  <div className="text-left min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${voice === v.id ? "text-text-primary" : "text-text-secondary"}`}>{v.name}</p>
                    <p className="text-[10px] text-text-muted">{v.gender === "M" ? "Male" : "Female"}</p>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-[12px] text-text-muted hover:text-text-secondary transition-colors w-full">
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />} <span>Advanced</span> <div className="flex-1 h-px bg-border ml-1" />
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Speed</label>
                    <div className="flex gap-1.5">{SPEEDS.map((s) => (<button key={s} onClick={() => setSpeed(s)} className={`chip flex-1 ${speed === s ? "active" : ""}`}>{s}</button>))}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Pitch</label>
                    <div className="flex gap-1.5">{PITCHES.map((p) => (<button key={p} onClick={() => setPitch(p)} className={`chip flex-1 ${pitch === p ? "active" : ""}`}>{p}</button>))}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Style</label>
                    <div className="flex flex-wrap gap-1.5">{STYLES.map((s) => (<button key={s} onClick={() => setStyle(s)} className={`chip ${style === s ? "active" : ""}`}>{s}</button>))}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={handleGenerate} disabled={generating || !text.trim()} className="btn-primary w-full !py-3">
              {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Volume2 size={16} /> Generate Speech</>}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ AUDIO PLAYER ═══ */}
      <AnimatePresence>
        {audioUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} className="glass p-4 md:p-5">
            <audio ref={audioRef} src={audioUrl} onEnded={handleEnd} onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }} preload="auto" />
            <div className="flex items-end justify-center gap-[3px] h-7 mb-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-[2.5px] rounded-full bg-accent transition-all" style={{
                  height: isPlaying ? `${6 + Math.random() * 18}px` : `${4 + Math.abs(Math.sin(i * 0.4)) * 12}px`,
                  opacity: currentTime > 0 && i / 24 < currentTime / (duration || 1) ? 0.85 : 0.15,
                  animation: isPlaying ? `waveBar ${0.4 + Math.random() * 0.5}s ease-in-out infinite alternate` : "none",
                  animationDelay: `${i * 0.04}s`,
                }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center hover:shadow-lg hover:shadow-accent/25 transition-all flex-shrink-0 active:scale-95">
                {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
              </button>
              <div className="flex-1 space-y-1 min-w-0">
                <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(e) => { const t = +e.target.value; if (audioRef.current) audioRef.current.currentTime = t; setCurrentTime(t); }} className="w-full" />
                <div className="flex justify-between text-[10px] text-text-muted font-mono">
                  <span>{fmt(currentTime)}</span>
                  <span className="text-text-secondary truncate px-2">{VOICES.find((v) => v.id === voice)?.name}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>
              <button onClick={handleDownload} className="btn-icon" title="Download"><Download size={17} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad slot */}
      <AdBanner slot="dashboard-bottom" />
    </div>
  );
}
