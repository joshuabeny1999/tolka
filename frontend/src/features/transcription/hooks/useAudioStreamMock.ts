import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptSegment, UseAudioStreamReturn } from '../types';

export const useAudioStreamMock = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const simulationIntervalRef = useRef<number | null>(null);
    const isRecordingRef = useRef(false);

    // --- SHARED LOGIC: Message Handling ---
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

            if (!data.text) return;

            if (data.is_partial) {
                setPartialText(data.text);
            } else {
                const newSegment: TranscriptSegment = {
                    id: crypto.randomUUID(),
                    text: data.text.trim(),
                    timestamp: Date.now(),
                    isFinal: true
                };
                setSegments(prev => [...prev, newSegment]);
                setPartialText("");
            }
        } catch (err) {
            console.error('JSON Error:', err);
        }
    }, []);

    // --- SHARED LOGIC: Cleanup ---
    const cleanup = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);

        // Clear Simulation
        if (simulationIntervalRef.current) {
            window.clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }

        // Close Socket
        if (socketRef.current) {
            if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
                socketRef.current.close();
            }
            socketRef.current = null;
        }
    }, []);

    const stopRecording = useCallback(() => {
        cleanup();
        setPartialText('');
    }, [cleanup]);

    // --- VIEWER CONNECTION (Listen Only) ---
    const connectViewer = useCallback(() => {
        if (!wsUrl) return;
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        cleanup();

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('Viewer Connected (Listen Only)');
                // WICHTIG: UI Status aktualisieren
                setIsRecording(true);
                isRecordingRef.current = true;
            };

            socket.onmessage = handleMessage;

            socket.onerror = () => {
                setError('Viewer Connection Error');
                // Bei Fehler auch Status zurücksetzen
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
    }, [wsUrl, cleanup, handleMessage]);

    // --- HOST CONNECTION (Simulating Audio) ---
    const startRecording = useCallback(async () => {
        setError(null);

        if (!wsUrl) {
            setError("No Session URL");
            return;
        }

        cleanup();
        isRecordingRef.current = true;

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WS: Connected (Mock Host)');

                if (isRecordingRef.current) {
                    setIsRecording(true);

                    // Start generating fake audio data
                    simulationIntervalRef.current = window.setInterval(() => {
                        if (socket.readyState === WebSocket.OPEN) {
                            // Create dummy payload (random noise)
                            const dummySize = 4096;
                            const dummyData = new Uint8Array(dummySize);
                            for (let i = 0; i < dummySize; i++) { dummyData[i] = Math.floor(Math.random() * 255); }

                            socket.send(dummyData);
                        }
                    }, 250);
                } else {
                    socket.close();
                }
            };

            socket.onmessage = handleMessage;

            socket.onerror = () => {
                if (isRecordingRef.current) setError('WebSocket connection failed');
            };

            socket.onclose = () => {
                if (isRecordingRef.current) {
                    stopRecording();
                    setError('Connection closed by server');
                }
            };

        } catch (err) {
            console.error(err);
            setError('Mock initialization failed.');
            isRecordingRef.current = false;
            cleanup();
        }
    }, [wsUrl, cleanup, handleMessage, stopRecording]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return {
        isRecording,
        segments,
        partialText,
        startRecording,
        stopRecording,
        connectViewer,
        error,
    };
};