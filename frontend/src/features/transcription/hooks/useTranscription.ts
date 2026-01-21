import { useState, useMemo, useCallback, useEffect } from "react";
import { useAudioStreamDeepgram } from "./useAudioStreamDeepgram";
import { useAudioStreamAzure } from "./useAudioStreamAzure";
import { useAudioStreamMock } from "./useAudioStreamMock";
import type { ProviderType } from "../types";

// Helper to build the Unified WS URL
const getWsUrl = (roomId: string | null, role: string | null, provider: ProviderType) => {
    if (!roomId || !role) return "";

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = (window as any).TOLKA_CONFIG?.WS_TOKEN || "";

    return `${protocol}//${host}/ws/connect?room=${roomId}&role=${role}&provider=${provider}&token=${token}`;
};

export function useTranscription(roomId: string | null, role: "host" | "viewer" | null, initialProvider: ProviderType) {
    const [provider, setProvider] = useState<ProviderType>(initialProvider);

    useEffect(() => {
        setProvider(initialProvider);
    }, [initialProvider]);

    // Dynamic WS URL based on session state
    const wsUrl = useMemo(() => getWsUrl(roomId, role, provider), [roomId, role, provider]);

    // Initialize hooks
    const azure = useAudioStreamAzure(provider === 'azure' ? wsUrl : "");
    const deepgram = useAudioStreamDeepgram(provider === 'deepgram' ? wsUrl : "");
    const mock = useAudioStreamMock(provider === 'mock' ? wsUrl : "");

    const activeStream = useMemo(() => {
        switch (provider) {
            case 'deepgram':
                return { stream: deepgram, meta: { name: 'Deepgram Nova-3', color: 'text-green-500' } };
            case 'mock':
                return { stream: mock, meta: { name: 'Simulated Stream', color: 'text-orange-500' } };
            case 'azure':
            default:
                return { stream: azure, meta: { name: 'Azure Speech', color: 'text-blue-500' } };
        }
    }, [provider, azure, deepgram, mock]);

    const { connectViewer, stopRecording: disconnectViewer } = activeStream.stream;

    // Auto-Connect Logik für Viewer
    useEffect(() => {
        if (role === 'viewer' && wsUrl) {
            console.log(`Viewer Mode: Auto-connecting to ${provider}...`);
            connectViewer();
        }

        return () => {
            if (role === 'viewer') {
                console.log("Viewer Mode: Cleaning up...");
                disconnectViewer();
            }
        };
    }, [role, wsUrl, connectViewer, disconnectViewer, provider]); // provider im log, dependency update


    const toggleRecording = useCallback((shouldRecord: boolean) => {
        if (role !== 'host') return;
        if (shouldRecord) {
            activeStream.stream.startRecording();
        } else {
            activeStream.stream.stopRecording();
        }
    }, [activeStream, role]);

    return {
        provider,
        setProvider,
        isRecording: activeStream.stream.isRecording,
        segments: activeStream.stream.segments,
        partialText: activeStream.stream.partialText,
        partialSpeaker: activeStream.stream.partialSpeaker,
        error: activeStream.stream.error,
        toggleRecording,
        socketRef: activeStream.stream.socketRef,
        meta: activeStream.meta
    };
}