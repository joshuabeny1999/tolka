import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptSegment } from '../types';

export const useBaseAudioStream = (wsUrl: string) => {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [partialText, setPartialText] = useState('');
    const [partialSpeaker, setPartialSpeaker] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const isRecordingRef = useRef(false);
    const lastCommittedSegmentRef = useRef<string | null>(null); // Für Azure De-bouncing

    useEffect(() => {
        setSegments([]);
        setIsRecording(false);
        setPartialText('');
        setPartialSpeaker(null);
        setError(null);
    }, [wsUrl]);

    // --- SHARED: Message Handling ---
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            if (!data.text) return;

            const trimmedText = data.text.trim();
            if (!trimmedText) return;

            if (data.is_partial) {
                setPartialText(trimmedText);
                if (data.speaker) setPartialSpeaker(data.speaker);
            } else {
                // De-bounce check (wichtig für Azure, schadet den anderen nicht)
                if (lastCommittedSegmentRef.current === trimmedText) return;
                lastCommittedSegmentRef.current = trimmedText;

                const newSegment: TranscriptSegment = {
                    id: crypto.randomUUID(),
                    text: trimmedText,
                    speaker: data.speaker.trim() || 'Unknown',
                    timestamp: Date.now(),
                    isFinal: true
                };
                setSegments(prev => [...prev, newSegment]);
                setPartialText("");
                setPartialSpeaker(null);
            }
        } catch (err) {
            console.error('JSON Error:', err);
        }
    }, []);

    // --- SHARED: Base Cleanup (Socket & UI) ---
    const baseCleanup = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);
        lastCommittedSegmentRef.current = null;

        if (socketRef.current) {
            if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
                socketRef.current.close();
            }
            socketRef.current = null;
        }
    }, []);

    const resetState = useCallback(() => {
        setPartialText('');
        setError(null);
    }, []);

    // --- SHARED: Viewer Connection ---
    const connectViewer = useCallback(() => {
        if (!wsUrl) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        baseCleanup();

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('Viewer Connected (Listen Only)');
                setIsRecording(true);
                isRecordingRef.current = true;
            };

            socket.onmessage = handleMessage;

            socket.onerror = () => {
                setError('Viewer Connection Error');
                setIsRecording(false);
                isRecordingRef.current = false;
            };

            socket.onclose = () => {
                console.log("Viewer Disconnected");
                setIsRecording(false);
                isRecordingRef.current = false;
            };

        } catch (err) {
            setError('Viewer Connection Failed');
            setIsRecording(false);
        }
    }, [wsUrl, baseCleanup, handleMessage]);

    // Cleanup bei Unmount
    useEffect(() => {
        return () => baseCleanup();
    }, [baseCleanup]);

    return {
        // State
        isRecording,
        segments,
        partialText,
        partialSpeaker,
        error,
        socketRef,
        isRecordingRef,
        setIsRecording,
        setError,
        handleMessage,
        baseCleanup,
        resetState,
        connectViewer
    };
};