import { useState, useEffect, useCallback } from "react";
import type { ProviderType } from "../types";

export interface SessionState {
    roomId: string | null;
    role: "host" | "viewer" | null;
    provider: ProviderType;
    isLoading: boolean;
    error: string | null;
}

export function useSession() {
    const [session, setSession] = useState<SessionState>({
        roomId: null,
        role: null,
        provider: "azure",
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        // 1. URL Parsen
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get("room");
        const roleParam = params.get("role");
        const providerParam = params.get("provider") as ProviderType;

        if (roomParam) {
            if (roleParam === 'host') {
                setSession({
                    roomId: roomParam,
                    role: "host",
                    provider: providerParam || "azure",
                    isLoading: false,
                    error: null,
                });
            } else {
                setSession({
                    roomId: roomParam,
                    role: "viewer",
                    provider: providerParam || "azure",
                    isLoading: false,
                    error: null,
                });
            }
        } else {
            // Lobby Modus
            setSession(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const createSession = useCallback(async (selectedProvider: ProviderType) => {
        setSession(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const res = await fetch(`/api/session?provider=${selectedProvider}`, {
                method: "POST"
            });

            if (!res.ok) throw new Error("Failed to create session");

            const data = await res.json();

            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("room", data.roomId);
            newUrl.searchParams.set("provider", selectedProvider);
            newUrl.searchParams.set("role", "host");

            window.history.pushState({}, "", newUrl);

            setSession({
                roomId: data.roomId,
                role: "host",
                provider: selectedProvider,
                isLoading: false,
                error: null
            });

        } catch (err) {
            setSession(prev => ({
                ...prev,
                isLoading: false,
                error: (err as Error).message
            }));
        }
    }, []);

    const closeSession = useCallback(async () => {
        if (!session.roomId) return;

        // Only the host destroys the room on the server
        if (session.role === 'host') {
            try {
                await fetch(`/api/session?room=${session.roomId}`, {
                    method: "DELETE"
                });
            } catch (err) {
                console.error("Failed to close session on server", err);
            }
        }

        // Clean URL
        const newUrl = new URL(window.location.href);
        newUrl.search = ""; // Remove all query params
        window.history.pushState({}, "", newUrl);

        setSession({
            roomId: null,
            role: null,
            provider: "azure",
            isLoading: false,
            error: null,
        });
    }, [session.roomId, session.role]);


    return { ...session, createSession, closeSession };
}