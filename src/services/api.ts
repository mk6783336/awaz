import { useStore } from "../store/useStore";

const BASE = "";

export async function apiFetch(
    url: string,
    options: RequestInit = {},
    binary = false
): Promise<any> {
    const token = useStore.getState().token;
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"] && options.body) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${BASE}${url}`, { ...options, headers });

    if (res.status === 401) {
        useStore.getState().clearUser();
        window.location.href = "/login";
        throw new Error("Session expired");
    }

    if (binary) {
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Request failed" }));
            throw new Error(err.error || `Request failed (${res.status})`);
        }
        return res;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

export async function refreshCredits() {
    try {
        const data = await apiFetch("/api/user/credits");
        useStore.getState().updateCredits(data.credits);
    } catch { }
}
