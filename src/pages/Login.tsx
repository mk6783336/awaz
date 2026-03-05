import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useStore } from "../store/useStore";
import { apiFetch } from "../services/api";
import { useToast } from "../components/Toast";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setError(""); setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(data.user, data.token);
      toast("Welcome back!", "success");
      navigate("/dashboard");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [email, password, setUser, navigate, toast]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 bg-bg-primary relative">
      <div className="orb" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-[380px] relative z-10">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold gradient-text mb-1">Awaz</h1>
          <p className="text-[13px] text-text-secondary">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="glass p-5 space-y-4">
          {error && <div className="px-3 py-2.5 rounded-lg bg-error/10 border border-error/15 text-error text-[13px]">{error}</div>}
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
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="input !pl-10 !pr-11" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon !min-w-[34px] !min-h-[34px]">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <>Sign In <ArrowRight size={15} /></>}
          </button>
          <p className="text-center text-[13px] text-text-secondary">
            No account? <Link to="/register" className="text-accent hover:text-accent-light font-medium">Create free</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
