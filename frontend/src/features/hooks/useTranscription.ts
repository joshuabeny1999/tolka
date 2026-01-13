import { useState, useMemo, useCallback } from "react";
import { useAudioStreamDeepgram } from "./useAudioStreamDeepgram";
import { useAudioStreamAzure } from "./useAudioStreamAzure";
import { useAudioStreamMock } from "./useAudioStreamMock";
import type { ProviderType } from "../types";

export function useTranscription() {
    // 1. Local State
    const [provider, setProvider] = useState<ProviderType>('azure');

    // 2. Configuration (Environment & URLs)
    // Note: Ensure window.TOLKA_CONFIG is defined in your global.d.ts if strict
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = `${protocol}//${window.location.hostname}:${window.location.port}`;
    const token = (window as any).TOLKA_CONFIG?.WS_TOKEN || "";

    // 3. Initialize all hooks
    const azure = useAudioStreamAzure(`${host}/ws/azure?token=${token}`);
    const deepgram = useAudioStreamDeepgram(`${host}/ws/deepgram?token=${token}`);
    const mock = useAudioStreamMock(`${host}/ws/mock?token=${token}`);

    // 4. Select the Active Stream Logic
    const activeStream = useMemo(() => {
        switch (provider) {
            case 'deepgram':
                return {
                    stream: deepgram,
                    meta: {
                        name: 'Deepgram Nova-3',
                        color: 'text-green-500'
                    }
                };
            case 'mock':
                return {
                    stream: mock,
                    meta: {
                        name: 'Simulated Stream',
                        color: 'text-orange-500'
                    }
                };
            case 'azure':
            default:
                return {
                    stream: azure,
                    meta: {
                        name: 'Azure Speech',
                        color: 'text-blue-500'
                    }
                };
        }
    }, [provider, azure, deepgram, mock]);

    // 5. Create the simplified API (The "Facade")

    // We combine start/stop into a single toggle function for the UI
    const toggleRecording = useCallback((shouldRecord: boolean) => {
        if (shouldRecord) {
            activeStream.stream.startRecording();
        } else {
            activeStream.stream.stopRecording();
        }
    }, [activeStream]);

    // Handle provider switching safely
    const handleSetProvider = useCallback((newProvider: ProviderType) => {
        if (activeStream.stream.isRecording) {
            activeStream.stream.stopRecording();
        }
        setProvider(newProvider);
    }, [activeStream, setProvider]);

    return {
        // State
        provider,
        setProvider: handleSetProvider, // This fixes "setProvider not used" warnings by wrapping it

        // Stream Data
        isRecording: activeStream.stream.isRecording,
        segments: activeStream.stream.segments,
        partialText: activeStream.stream.partialText,
        error: activeStream.stream.error,

        // Actions
        toggleRecording,
        // Metadata
        meta: activeStream.meta
    };
}