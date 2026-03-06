import React, { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useStore } from "../store/useStore";
import { apiFetch } from "../services/api";
import { useToast } from "../components/Toast";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Logo from "../components/Logo";

function getStrength(p: string) {
  if (p.length < 8) return { label: "Too short", color: "bg-error", w: "20%" };
  let s = 0;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  if (p.length >= 12) s++;
  if (s <= 1) return { label: "Weak", color: "bg-error", w: "33%" };
  if (s <= 2) return { label: "Medium", color: "bg-yellow-500", w: "66%" };
  return { label: "Strong", color: "bg-success", w: "100%" };
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const strength = useMemo(() => getStrength(password), [password]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("All fields are required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError(""); setLoading(true);
    try {
      const data = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      setUser(data.user, data.token);
      toast("Welcome! 10,000 free credits 🎉", "success");
      navigate("/dashboard");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [name, email, password, setUser, navigate, toast]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 bg-bg-primary relative">
      <div className="orb" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-[380px] relative z-10">
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" className="mb-2" />
          <p className="text-[13px] text-text-secondary">Start with 10,000 free credits</p>
        </div>
        <form onSubmit={handleSubmit} className="glass p-5 space-y-4">
          {error && <div className="px-3 py-2.5 rounded-lg bg-error/10 border border-error/15 text-error text-[13px]">{error}</div>}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-text-secondary">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input !pl-10" autoComplete="name" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-text-secondary">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input !pl-10" autoComplete="email" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-text-secondary">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="input !pl-10 !pr-11" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon !min-w-[34px] !min-h-[34px]">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="pt-1 space-y-0.5">
                <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${strength.color} transition-all duration-300`} style={{ width: strength.w }} />
                </div>
                <span className="text-[10px] text-text-muted">{strength.label}</span>
              </div>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <>Create Account <ArrowRight size={15} /></>}
          </button>
          <p className="text-center text-[13px] text-text-secondary">
            Have an account? <Link to="/login" className="text-accent hover:text-accent-light font-medium">Sign in</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
