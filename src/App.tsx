import { Suspense, lazy } from "react";
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
