import { memo, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { refreshCredits } from "../../services/api";
import { motion } from "motion/react";
import { Mic, MessageSquare, Clock, Settings, LogOut, Zap } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Studio", icon: Mic },
  { to: "/conversation", label: "Chat", icon: MessageSquare },
  { to: "/history", label: "History", icon: Clock },
  { to: "/settings", label: "Settings", icon: Settings },
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, clearUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { refreshCredits(); }, [location.pathname]);

  const handleSignOut = useCallback(() => {
    clearUser();
    navigate("/login");
  }, [clearUser, navigate]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-bg-primary overflow-hidden">
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden md:flex flex-col w-[220px] min-w-[220px] lg:w-[240px] lg:min-w-[240px] bg-bg-secondary border-r border-border flex-shrink-0">
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <h1 className="font-display text-2xl font-bold gradient-text leading-tight">Awaz</h1>
          <p className="text-[10px] text-accent font-semibold tracking-[0.15em] uppercase mt-0.5">Urdu Voice AI</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${isActive
                  ? "bg-accent-glow text-accent font-semibold border-l-[3px] border-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03] border-l-[3px] border-transparent"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Credits + User */}
        <div className="px-3 pb-3 space-y-2">
          <div className="px-3 py-2.5 rounded-lg bg-accent-glow/50 border border-accent/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={12} className="text-accent" />
              <span className="text-xs font-bold text-accent">{user?.credits?.toLocaleString()}</span>
              <span className="text-[10px] text-text-muted ml-auto">free</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, ((user?.credits ?? 0) / 10000) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-2 py-2 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">{user?.name}</p>
              <p className="text-[10px] text-text-muted">Free Plan</p>
            </div>
            <button onClick={handleSignOut} className="btn-icon !min-w-[32px] !min-h-[32px] opacity-0 group-hover:opacity-100 hover:!text-error" title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[68px] md:pb-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/95 backdrop-blur-xl border-t border-border flex-shrink-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around h-[56px]">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] rounded-lg transition-all ${isActive ? "text-accent" : "text-text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavDot"
                      className="w-1 h-1 rounded-full bg-accent -mt-0.5"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default memo(DashboardLayout);
