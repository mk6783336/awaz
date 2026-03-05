import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Mic, Bot, Zap, ChevronRight } from "lucide-react";
import AdBanner from "../components/AdBanner";

const features = [
  { icon: Mic, title: "Natural Urdu Voices", desc: "5 distinct voices with regional accents and emotional range" },
  { icon: Bot, title: "Groq-Powered AI Chat", desc: "Bilingual Urdu-English AI conversations, blazingly fast" },
  { icon: Zap, title: "Instant Generation", desc: "Generate natural speech in under 3 seconds" },
];

const steps = [
  { num: "01", title: "Write or paste", desc: "Enter your Urdu text or use AI to generate a script" },
  { num: "02", title: "Choose a voice", desc: "Pick from 5 natural Pakistani voices" },
  { num: "03", title: "Generate & download", desc: "Get studio-quality WAV audio instantly" },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-bg-primary overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 w-full z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold gradient-text">Awaz</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/login")} className="btn-ghost !py-1.5 !px-3 !text-[13px] !min-h-[36px]">Sign In</button>
            <button onClick={() => navigate("/register")} className="btn-primary !py-1.5 !px-3 !text-[13px] !min-h-[36px]">Start Free</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 pt-12">
        <div className="orb" />
        <motion.div variants={stagger} initial="hidden" animate="visible" className="relative z-10 max-w-lg md:max-w-2xl mx-auto">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-bg-card/50 text-[12px] text-text-secondary mb-6">
            ✨ Powered by Gemini & Groq
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-display font-bold gradient-text leading-[1.08] mb-4 text-[clamp(32px,7vw,72px)]">
            Pakistan's Voice AI
          </motion.h1>

          <motion.p variants={fadeUp} className="text-[15px] md:text-[17px] text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
            Transform Urdu text into natural speech with 5 voices. Have AI conversations. 100% free.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-2.5 justify-center mb-4">
            <button onClick={() => navigate("/register")} className="btn-primary !py-3 !px-6 w-full sm:w-auto">
              Start Free — 10,000 Credits <ArrowRight size={16} />
            </button>
            <button onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} className="btn-ghost !py-3 !px-6 w-full sm:w-auto">
              How It Works
            </button>
          </motion.div>
          <motion.p variants={fadeUp} className="text-[11px] text-text-muted">No credit card • Completely free</motion.p>
        </motion.div>
      </section>

      {/* Ad slot after hero */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <AdBanner slot="landing-hero" />
      </div>

      {/* ═══ FEATURES ═══ */}
      <section className="py-14 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
            Everything you need
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="glass p-5 hover:border-accent/25 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-accent-glow flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <f.icon size={18} className="text-accent" />
                </div>
                <h3 className="text-[15px] font-semibold mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-14 md:py-20 px-4 bg-bg-secondary/40">
        <div className="max-w-3xl mx-auto">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-display text-2xl md:text-3xl font-bold text-center mb-12">
            Three simple steps
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <span className="font-display text-4xl font-bold text-accent/15">{s.num}</span>
                <h3 className="text-[15px] font-semibold mt-1 mb-1.5">{s.title}</h3>
                <p className="text-[13px] text-text-secondary">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate("/register")} className="btn-primary !py-3 !px-7">
              Get Started <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Ad slot before footer */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <AdBanner slot="landing-footer" />
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3 text-[12px] text-text-muted text-center">
          <span>Built with ❤️ in Pakistan 🇵🇰</span>
          <div className="flex gap-5">
            <span className="hover:text-text-secondary cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-text-secondary cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-text-secondary cursor-pointer transition-colors">Contact</span>
          </div>
          <span className="text-[10px] text-text-muted/40">Developed by Mujahid · Hazara University Mansehra · Bioinformatics</span>
        </div>
      </footer>
    </div>
  );
}
