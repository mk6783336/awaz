import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { apiFetch, refreshCredits } from "../services/api";
import { generateSpeech } from "../services/ttsService";
import { useToast } from "../components/Toast";
import type { ChatMessage } from "../types";
import { Send, Volume2, Loader2, Bot, User, Square, MessageCircle } from "lucide-react";

const VOICES = [
  { id: "ayesha", name: "Ayesha" }, { id: "bilal", name: "Bilal" },
  { id: "tariq", name: "Tariq" }, { id: "zain", name: "Zain" },
  { id: "fatima", name: "Fatima" },
];

export default function Conversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [voice, setVoice] = useState("bilal");
  const [loading, setLoading] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [ttsLoading, setTtsLoading] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleSend = useCallback(async () => {
    const t = input.trim();
    if (!t || loading) return;
    const userMsg: ChatMessage = { role: "user", content: t };
    const updated = [...messages, userMsg];
    setMessages(updated); setInput(""); setLoading(true);
    try {
      const d = await apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ messages: updated }) });
      setMessages([...updated, { role: "assistant", content: d.reply }]);
      await refreshCredits();
    } catch (err: any) {
      setMessages([...updated, { role: "assistant", content: `Error: ${err.message}` }]);
      toast(err.message, "error");
    } finally { setLoading(false); }
  }, [input, messages, loading, toast]);

  const handlePlay = useCallback(async (text: string, idx: number) => {
    if (playingIdx === idx) { audioRef.current?.pause(); audioRef.current = null; setPlayingIdx(null); return; }
    setTtsLoading(idx);
    try {
      const r = await generateSpeech({ text, voiceName: voice });
      const audio = new Audio(r.audioUrl);
      audioRef.current = audio; setPlayingIdx(idx); setTtsLoading(null);
      audio.play();
      audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(r.audioUrl); };
    } catch { setTtsLoading(null); toast("Audio failed", "error"); }
  }, [playingIdx, voice, toast]);

  const onKey = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border bg-bg-secondary/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center flex-shrink-0">
            <MessageCircle size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold truncate">AI Chat</h1>
            <p className="text-[10px] text-text-muted truncate">Groq • 🔊 tap to hear</p>
          </div>
        </div>
        <select value={voice} onChange={(e) => setVoice(e.target.value)} className="input !w-auto !py-1.5 !px-2.5 !text-[11px] !min-h-[34px]">
          {VOICES.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-5 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-accent-glow flex items-center justify-center mb-4 float">
              <Bot size={24} className="text-accent" />
            </div>
            <h3 className="text-[15px] font-semibold mb-1">Start a conversation</h3>
            <p className="text-[12px] text-text-secondary max-w-[260px]">Chat in Urdu or English. Tap 🔊 on any response to listen.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-md bg-accent-glow flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={12} className="text-accent" />
              </div>
            )}
            <div className={`max-w-[82%] sm:max-w-[70%] ${msg.role === "user"
                ? "bg-gradient-to-br from-accent to-accent-light text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-md shadow-accent/10"
                : "glass rounded-2xl rounded-bl-sm px-3.5 py-2.5"
              }`}>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" dir="auto">{msg.content}</p>
              {msg.role === "assistant" && (
                <button onClick={() => handlePlay(msg.content, idx)} disabled={ttsLoading === idx}
                  className={`mt-1.5 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-all ${playingIdx === idx ? "text-accent bg-accent-glow" : "text-text-muted hover:text-accent hover:bg-white/5"
                    }`}>
                  {ttsLoading === idx ? <><Loader2 size={11} className="animate-spin" /> Loading</>
                    : playingIdx === idx ? <><Square size={11} /> Stop</>
                      : <><Volume2 size={11} /> Play</>}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-md bg-bg-elevated flex items-center justify-center flex-shrink-0 mt-1">
                <User size={12} className="text-text-secondary" />
              </div>
            )}
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-glow flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-accent" />
            </div>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 md:px-5 py-2.5 border-t border-border bg-bg-secondary/50 backdrop-blur-sm flex-shrink-0"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
            placeholder="Type a message... (اردو یا English)" dir="auto" className="input flex-1 !text-[13px]" />
          <button onClick={handleSend} disabled={loading || !input.trim()} className="btn-primary !p-0 !w-11 !h-11 !rounded-xl flex-shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
