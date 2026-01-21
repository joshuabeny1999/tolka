import { useState, useCallback, useEffect, useRef } from 'react';
import type { SpeakerData } from '../types';

const normalize = (deg: number) => {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
};

// Wir brauchen isConnected (alias isRecording), um den richtigen Moment abzupassen
export function useSpeakerRegistry(
    socketRef: React.RefObject<WebSocket | null>,
    isConnected: boolean
) {
    const [registry, setRegistry] = useState<Record<string, SpeakerData>>({});
    const [rotationOffset, setRotationOffset] = useState(0);

    // Verhindert endlos-Loops beim Anfragen
    const hasRequestedSync = useRef(false);

    // Reset bei Verbindungsabbruch
    useEffect(() => {
        if (!isConnected) {
            hasRequestedSync.current = false;
        }
    }, [isConnected]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !isConnected) return;

        // 1. LISTENER REGISTRIEREN
        const handler = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'speaker_update') {
                    // Merge State: Bestehende Daten behalten, neue dazu
                    setRegistry(prev => ({ ...prev, ...msg.payload }));
                }
            } catch (e) { /* ignore */ }
        };

        socket.addEventListener('message', handler);

        // 2. SYNC ANFORDERN (Das Pull-Prinzip)
        // Sobald wir verbunden sind und der Listener steht, fragen wir: "Wer ist da?"
        if (!hasRequestedSync.current && socket.readyState === WebSocket.OPEN) {
            console.log("Frage Backend nach Speaker-Liste...");
            socket.send(JSON.stringify({ type: "get_speakers" }));
            hasRequestedSync.current = true;
        }

        return () => socket.removeEventListener('message', handler);
    }, [socketRef, isConnected]); // Wichtig: Re-Run wenn Verbindung steht
    
    const updateSpeaker = useCallback((id: string, name: string, position: number) => {
        // Optimistic Update
        setRegistry(prev => ({
            ...prev,
            [id]: { name, position }
        }));

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'update_speaker',
                speakerId: id,
                name: name,
                position: position
            }));
        }
    }, [socketRef]);

    const calibrateView = useCallback((hostVisualAngle: number) => {
        const serverHostPos = 180;
        setRotationOffset(hostVisualAngle - serverHostPos);
    }, []);

    const getDirection = useCallback((speakerId: string): number | null => {
        const data = registry[speakerId];
        if (!data) return null;
        return normalize(data.position + rotationOffset);
    }, [registry, rotationOffset]);

    const getName = useCallback((id: string) => {
        return registry[id]?.name || id;
    }, [registry]);

    return { registry, updateSpeaker, calibrateView, getDirection, getName };
}