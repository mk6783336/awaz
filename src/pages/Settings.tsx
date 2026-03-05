import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useStore } from "../store/useStore";
import { apiFetch, refreshCredits } from "../services/api";
import { useToast } from "../components/Toast";
import AdBanner from "../components/AdBanner";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Loader2, Zap, Check, LogOut, Shield } from "lucide-react";

const TABS = ["Profile", "Credits", "Security"] as const;

export default function Settings() {
  const { user, clearUser, updateUser } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<typeof TABS[number]>("Profile");

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const profileChanged = useMemo(() => name !== user?.name || email !== user?.email, [name, email, user]);

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [secLoading, setSecLoading] = useState(false);

  useEffect(() => { refreshCredits(); }, []);

  const handleProfileSave = useCallback(async () => {
    if (!name.trim()) { toast("Name is required", "error"); return; }
    setProfileLoading(true);
    try {
      const d = await apiFetch("/api/user/update", { method: "POST", body: JSON.stringify({ name, email }) });
      updateUser(d.user); toast("Profile updated", "success");
    } catch (err: any) { toast(err.message, "error"); }
    finally { setProfileLoading(false); }
  }, [name, email, toast, updateUser]);

  const handleChangePassword = useCallback(async () => {
    if (!curPass || !newPass) { toast("Fill all fields", "error"); return; }
    if (newPass.length < 8) { toast("Min 8 characters", "error"); return; }
    if (newPass !== confirmPass) { toast("Passwords don't match", "error"); return; }
    setSecLoading(true);
    try {
      await apiFetch("/api/user/change-password", { method: "POST", body: JSON.stringify({ currentPassword: curPass, newPassword: newPass }) });
      toast("Password changed!", "success"); setCurPass(""); setNewPass(""); setConfirmPass("");
    } catch (err: any) { toast(err.message, "error"); }
    finally { setSecLoading(false); }
  }, [curPass, newPass, confirmPass, toast]);

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold tracking-tight">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
        {TABS.map((t) => (<button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? "active" : ""}`}>{t}</button>))}
      </div>

      {/* ═══ PROFILE ═══ */}
      {tab === "Profile" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 md:p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-xl md:text-2xl font-bold text-white flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              <p className="text-[12px] text-text-secondary truncate">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] text-accent font-semibold bg-accent-glow px-2 py-0.5 rounded-full">Free Plan</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-text-secondary">Name</label>
              <div className="relative">
                <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={name} onChange={(e) => setName(e.target.value)} className="input !pl-10" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-text-secondary">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input !pl-10" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={handleProfileSave} disabled={!profileChanged || profileLoading} className="btn-primary flex-1">
              {profileLoading ? <><Loader2 size={15} className="animate-spin" /> Saving</> : <><Check size={15} /> Save</>}
            </button>
            <button onClick={() => { clearUser(); navigate("/login"); }} className="btn-ghost !text-error hover:!border-error/30 flex-1 sm:flex-none">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══ CREDITS ═══ */}
      {tab === "Credits" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass p-4 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-glow flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-accent">{user?.credits?.toLocaleString()}</p>
                <p className="text-[12px] text-text-secondary">free credits remaining</p>
              </div>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-700" style={{ width: `${Math.min(100, ((user?.credits ?? 0) / 10000) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-text-muted">{((user?.credits ?? 0) / 100).toLocaleString()} generations left (100 credits each)</p>
          </div>

          <div className="glass p-4 md:p-6 space-y-3">
            <h3 className="text-[14px] font-semibold">What's included — Free Forever</h3>
            <ul className="space-y-2">
              {["10,000 free credits", "5 natural Urdu voices", "AI chat in Urdu & English", "Audio history & downloads", "Speed, pitch & style controls"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <Check size={14} className="text-success flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* ═══ SECURITY ═══ */}
      {tab === "Security" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={17} className="text-accent" />
            <h2 className="text-[15px] font-semibold">Change Password</h2>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-text-secondary">Current Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type={showCur ? "text" : "password"} value={curPass} onChange={(e) => setCurPass(e.target.value)} className="input !pl-10 !pr-11" placeholder="Current password" />
                <button type="button" onClick={() => setShowCur(!showCur)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon !min-w-[34px] !min-h-[34px]">
                  {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-text-secondary">New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} className="input !pl-10 !pr-11" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon !min-w-[34px] !min-h-[34px]">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-text-secondary">Confirm New</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="input !pl-10" placeholder="Re-enter" />
              </div>
            </div>
          </div>
          <button onClick={handleChangePassword} disabled={secLoading || !curPass || !newPass || !confirmPass} className="btn-primary w-full sm:w-auto">
            {secLoading ? <><Loader2 size={15} className="animate-spin" /> Changing</> : <><Shield size={15} /> Update Password</>}
          </button>
        </motion.div>
      )}

      {/* Ad + dev credit */}
      <AdBanner slot="settings-bottom" />
      <p className="text-center text-[9px] text-text-muted/30 pt-2">
        Developed by Mujahid · Hazara University Mansehra · Bioinformatics
      </p>
    </div>
  );
}
