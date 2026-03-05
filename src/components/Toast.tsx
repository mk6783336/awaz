import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    exiting?: boolean;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
        }, 3000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            {createPortal(
                <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-[9999] flex flex-col gap-2 w-[90vw] max-w-[380px]">
                    {toasts.map((t) => (
                        <div
                            key={t.id}
                            style={{
                                animation: t.exiting ? "toastOut 0.3s ease forwards" : "toastIn 0.3s ease forwards",
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${t.type === "success"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : t.type === "error"
                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                        : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                }`}
                        >
                            {t.type === "success" && <CheckCircle size={18} className="flex-shrink-0" />}
                            {t.type === "error" && <XCircle size={18} className="flex-shrink-0" />}
                            {t.type === "info" && <AlertCircle size={18} className="flex-shrink-0" />}
                            <span className="text-sm font-medium text-white/90 flex-1">{t.message}</span>
                            <button onClick={() => removeToast(t.id)} className="btn-icon !min-w-0 !min-h-0 p-1">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}
