import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/useStore";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Conversation = lazy(() => import("./pages/Conversation"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout"));

function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Suspense fallback={<Loader />}>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, setUser, clearUser, ready, setReady } = useStore();
  const [initializing, setInitializing] = useState(!ready && !!token);

  // Validate stored token on first mount
  useEffect(() => {
    if (ready) return;
    if (!token) {
      setReady();
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user, token);
        } else {
          clearUser();
        }
      } catch {
        // Network error — keep stored state, don't force logout
      } finally {
        setReady();
        setInitializing(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (initializing) return <Loader />;

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/conversation" element={<ProtectedRoute><Conversation /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

